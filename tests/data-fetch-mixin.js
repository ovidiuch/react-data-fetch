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
    onError(null, 503, 'foobar');

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
    onError(null, 503, 'foobar');

    expect(fakeComponent.setState.callCount).to.equal(prevCallCount);
  })
});
