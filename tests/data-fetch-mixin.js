describe("DataFetch mixin", function() {

  var _ = require('lodash'),
      $ = require('jquery'),
      chai = require('chai'),
      expect = chai.expect,
      sinon = require('sinon'),
      sinonChai = require('sinon-chai'),
      DataFetch = require('../src/data-fetch-mixin.js');

  chai.use(sinonChai);

  var ajaxStub,
      fakeComponent;

  beforeEach(function() {
    ajaxStub = {};

    // Mock jQuery forcefully, $.ajax is not even a function because jQuery
    // doesn't detect a DOM
    $.ajax = sinon.stub().returns(ajaxStub);

    fakeComponent = _.clone(DataFetch);

    // Mock React API
    fakeComponent.setState = sinon.spy();
    fakeComponent.props = {};
  });

  it("should call $.ajax with dataUrl prop on mount", function() {
    fakeComponent.props.dataUrl = 'my-api.json';

    fakeComponent.componentWillMount();

    expect($.ajax.args[0][0].url).to.equal('my-api.json');
  });

  it("should not call $.ajax when dataUrl is equal", function() {
    fakeComponent.props.dataUrl = 'my-api.json';
    fakeComponent.componentWillMount();

    fakeComponent.componentWillReceiveProps({
      dataUrl: 'my-api.json'
    });

    expect($.ajax.callCount).to.equal(1);
  });

  it("should call $.ajax when dataUrl prop changes", function() {
    ajaxStub.abort = function(){};

    fakeComponent.props.dataUrl = 'my-api.json';
    fakeComponent.componentWillMount();

    fakeComponent.componentWillReceiveProps({
      dataUrl: 'my-api2.json'
    });

    expect($.ajax.lastCall.args[0].url).to.equal('my-api2.json');
  });

  it("should abort first call when changing dataUrl", function() {
    ajaxStub.abort = sinon.spy();

    fakeComponent.props.dataUrl = 'my-api.json';
    fakeComponent.componentWillMount();

    fakeComponent.componentWillReceiveProps({
      dataUrl: 'my-api2.json'
    });

    expect(ajaxStub.abort).to.have.been.called;
  });

  it("should call $.ajax with getDataUrl method if defined", function() {
    fakeComponent.getDataUrl = sinon.stub().returns('my-custom-api.json');

    fakeComponent.componentWillMount();

    expect(fakeComponent.getDataUrl).to.have.been.called;
    expect($.ajax.args[0][0].url).to.equal('my-custom-api.json');
  });

  it("should call getDataUrl with props", function() {
    fakeComponent.getDataUrl = sinon.spy();
    fakeComponent.props.someProp = true;

    fakeComponent.componentWillMount();

    expect(fakeComponent.getDataUrl).to.have.been.calledWith({
      someProp: true
    });
  });

  it("should call $.ajax with receiveDataFromServer callback", function() {
    fakeComponent.props.dataUrl = 'my-api.json';
    fakeComponent.componentWillMount();

    expect($.ajax.args[0][0].success)
          .to.equal(fakeComponent.receiveDataFromServer);
  });

  it("should populate state.data with returned data", function() {
    fakeComponent.receiveDataFromServer({
      name: 'John Doe',
      age: 42
    });

    var setStateArgs = fakeComponent.setState.args[0][0];
    expect(setStateArgs.data.name).to.equal('John Doe');
    expect(setStateArgs.data.age).to.equal(42);
  });

  it("should call $.ajax again when refreshData is called", function() {
    ajaxStub.abort = function(){};

    fakeComponent.props.dataUrl = 'my-api.json';
    fakeComponent.componentWillMount();

    fakeComponent.refreshData();

    expect($.ajax.lastCall.args[0].url).to.equal('my-api.json');
  });

  describe("when pollInterval is set", function() {

    var _setInterval;

    beforeEach(function() {
      _setInterval = setInterval;
      setInterval = sinon.spy();
    });

    afterEach(function() {
      setInterval = _setInterval;
    });

    it("should call setInterval with correct delay", function() {
      fakeComponent.props.dataUrl = 'my-api.json';
      fakeComponent.props.pollInterval = 500;

      fakeComponent.componentWillMount();

      var setIntervalArgs = setInterval.args[0];
      expect(setIntervalArgs[1]).to.equal(500);
    });

    it("should call $.ajax again when triggering callback", function() {
      fakeComponent.props.dataUrl = 'my-api.json';
      fakeComponent.props.pollInterval = 500;

      fakeComponent.componentWillMount();

      var setIntervalCallback = setInterval.args[0][0];
      setIntervalCallback();

      expect($.ajax.callCount).to.equal(2);
    });
  });

  it("should set isFetchingData true when mounting", function() {
    fakeComponent.props.dataUrl = 'my-api.json';

    fakeComponent.componentWillMount();

    var setStateArgs = fakeComponent.setState.args[0][0];
    expect(setStateArgs.isFetchingData).to.equal(true);
  });

  it("should set isFetchingData false when receiving data", function() {
    fakeComponent.receiveDataFromServer({});

    var setStateArgs = fakeComponent.setState.args[0][0];
    expect(setStateArgs.isFetchingData).to.equal(false);
  });

  it("should set isFetchingData false if request errors", function() {
    fakeComponent.props.dataUrl = 'my-api.json';

    fakeComponent.componentWillMount();

    var onError = $.ajax.args[0][0].error;
    onError({}, 503, 'foobar');

    var setStateArgs = fakeComponent.setState.lastCall.args[0];
    expect(setStateArgs.isFetchingData).to.equal(false);
  });

  it("should not set state if request errors after unmount", function() {
    ajaxStub.abort = function(){};

    fakeComponent.props.dataUrl = 'my-api.json';

    fakeComponent.componentWillMount();
    fakeComponent.componentWillUnmount();

    var prevCallCount = fakeComponent.setState.callCount;

    var onError = $.ajax.args[0][0].error;
    onError({}, 503, 'foobar');

    expect(fakeComponent.setState.callCount).to.equal(prevCallCount);
  });

  it("should set isFetchingData to false in initial state", function() {
    var initialState = fakeComponent.getInitialState();

    expect(initialState.isFetchingData).to.equal(false);
  });

  it("should set dataError to null in initial state", function() {
    var initialState = fakeComponent.getInitialState();

    expect(initialState.dataError).to.equal(null);
  });

  describe("dataError set in this.state for failed requests", function() {
    var url = 'www.foo.bar',
        setStateArgs,
        err = {toString: sinon.stub()},
        xhrObj = {
          status: 404,
          statusText: 'Not found'
        };

    beforeEach(function() {
      fakeComponent.props.dataUrl = url;

      fakeComponent.componentWillMount();

      var onError = $.ajax.args[0][0].error;
      onError(xhrObj, xhrObj.status, err);

      setStateArgs = fakeComponent.setState.lastCall.args[0];
    });

    afterEach(function() {
      err.toString.reset();
    });

    it("should save the url of a failed request", function() {
      expect(setStateArgs.dataError.url).to.equal(url);
    });

    it("should save the statusCode of a failed request", function() {
      expect(setStateArgs.dataError.statusCode).to.equal(xhrObj.status);
    });

    it("should save the statusText of a failed request", function() {
      expect(setStateArgs.dataError.statusText).to.equal(xhrObj.status);
    });

    it("should save the message of a failed request", function() {
      expect(err.toString.callCount).to.equal(1);
    });
  });

  describe("dataError should reset", function() {
    beforeEach(function() {
      fakeComponent.props.dataUrl = 'foo';

      fakeComponent.componentWillMount();

      var onError = $.ajax.args[0][0].error;
      ajaxStub.abort = function(){};
      onError({}, 404, 'foobar');
    });

    it("should reset dataError when refreshing data", function() {
      fakeComponent.refreshData();

      var setStateArgs = fakeComponent.setState.lastCall.args[0];

      expect(setStateArgs.dataError).to.equal(null);
    });

    it("should reset dataError when receiving new dataUrl", function() {
      fakeComponent.componentWillReceiveProps({
        dataUrl: 'bar'
      });

      var setStateArgs = fakeComponent.setState.lastCall.args[0];

      expect(setStateArgs.dataError).to.equal(null);
    });
  });

  describe("when stopping fetching", function() {
    var nativeClearInterval = clearInterval;

    beforeEach(function() {
      clearInterval = sinon.spy();
      ajaxStub.abort = sinon.spy();

      fakeComponent.props.dataUrl = 'my-api.json';
      fakeComponent.props.pollInterval = 5000;
      fakeComponent.componentWillMount();

      fakeComponent.stopFetching();
    });

    afterEach(function() {
      clearInterval = nativeClearInterval;
    })

    it("should abort ajax call", function() {
      expect(ajaxStub.abort).to.have.been.called;
    });

    it("should clear interval", function() {
      expect(clearInterval).to.have.been.called;
    });
  });
});
