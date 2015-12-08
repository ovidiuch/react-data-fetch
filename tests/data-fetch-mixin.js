var _ = require('lodash'),
    $ = require('jquery'),
    DataFetch = require('../src/data-fetch-mixin.js');

describe('DataFetch mixin', function() {
  var ajaxStub, fakeComponent;

  beforeEach(function() {
    ajaxStub = {
      abort: function() {}
    };

    // Mock jQuery forcefully, $.ajax is not even a function because jQuery
    // doesn't detect a DOM
    $.ajax = sinon.stub().returns(ajaxStub);

    // Mock React API
    fakeComponent = {
      setState: sinon.spy(),
      props: {}
    };
  });

  describe('same domain', function() {
    beforeEach(function() {
      _.assign(fakeComponent, DataFetch());
    });

    it('should call $.ajax with dataUrl prop on mount', function() {
      fakeComponent.props.dataUrl = 'my-api.json';

      fakeComponent.componentWillMount();

      expect($.ajax.args[0][0].url).to.equal('my-api.json');
    });

    it('should not call $.ajax when dataUrl is equal', function() {
      fakeComponent.props.dataUrl = 'my-api.json';
      fakeComponent.componentWillMount();

      fakeComponent.componentWillReceiveProps({
        dataUrl: 'my-api.json'
      });

      expect($.ajax.callCount).to.equal(1);
    });

    it('should not send cross-domain cookies', function() {
      fakeComponent.props.dataUrl = 'my-api.json';

      fakeComponent.componentWillMount();

      expect($.ajax).to.have.been.calledWith(
          sinon.match.has('xhrFields',
                          sinon.match.has('withCredentials', false)));
    });

    it('should call $.ajax when dataUrl prop changes', function() {
      ajaxStub.abort = function() {};

      fakeComponent.props.dataUrl = 'my-api.json';
      fakeComponent.componentWillMount();

      fakeComponent.componentWillReceiveProps({
        dataUrl: 'my-api2.json'
      });

      expect($.ajax.lastCall.args[0].url).to.equal('my-api2.json');
    });

    it('should abort first call when changing dataUrl', function() {
      ajaxStub.abort = sinon.spy();

      fakeComponent.props.dataUrl = 'my-api.json';
      fakeComponent.componentWillMount();

      fakeComponent.componentWillReceiveProps({
        dataUrl: 'my-api2.json'
      });

      expect(ajaxStub.abort).to.have.been.called;
    });

    it('should call $.ajax with getDataUrl method if defined', function() {
      fakeComponent.getDataUrl = sinon.stub().returns('my-custom-api.json');

      fakeComponent.componentWillMount();

      expect(fakeComponent.getDataUrl).to.have.been.called;
      expect($.ajax.args[0][0].url).to.equal('my-custom-api.json');
    });

    it('should call getDataUrl with props', function() {
      fakeComponent.getDataUrl = sinon.spy();
      fakeComponent.props.someProp = true;

      fakeComponent.componentWillMount();

      expect(fakeComponent.getDataUrl).to.have.been.calledWith({
        someProp: true
      });
    });

    it('should call $.ajax with receiveDataFromServer callback', function() {
      fakeComponent.props.dataUrl = 'my-api.json';
      fakeComponent.componentWillMount();

      expect($.ajax.args[0][0].success)
            .to.equal(fakeComponent.receiveDataFromServer);
    });

    it('should populate state.data with returned data', function() {
      fakeComponent.receiveDataFromServer({
        name: 'John Doe',
        age: 42
      });

      var setStateArgs = fakeComponent.setState.args[0][0];
      expect(setStateArgs.data.name).to.equal('John Doe');
      expect(setStateArgs.data.age).to.equal(42);
    });

    it('should call $.ajax again when refreshData is called', function() {
      ajaxStub.abort = function() {};

      fakeComponent.props.dataUrl = 'my-api.json';
      fakeComponent.componentWillMount();

      fakeComponent.refreshData();

      expect($.ajax.lastCall.args[0].url).to.equal('my-api.json');
    });

    it('should set isFetchingData true when mounting', function() {
      fakeComponent.props.dataUrl = 'my-api.json';

      fakeComponent.componentWillMount();

      var setStateArgs = fakeComponent.setState.args[0][0];
      expect(setStateArgs.isFetchingData).to.equal(true);
    });

    it('should set isFetchingData false when receiving data', function() {
      fakeComponent.receiveDataFromServer({});

      var setStateArgs = fakeComponent.setState.args[0][0];
      expect(setStateArgs.isFetchingData).to.equal(false);
    });

    it('should set isFetchingData false if request errors', function() {
      fakeComponent.props.dataUrl = 'my-api.json';

      fakeComponent.componentWillMount();

      var onError = $.ajax.args[0][0].error;
      onError({}, 503, 'foobar');

      var setStateArgs = fakeComponent.setState.lastCall.args[0];
      expect(setStateArgs.isFetchingData).to.equal(false);
    });

    it('should not set state if request errors after unmount', function() {
      ajaxStub.abort = function() {};

      fakeComponent.props.dataUrl = 'my-api.json';

      fakeComponent.componentWillMount();
      fakeComponent.componentWillUnmount();

      var prevCallCount = fakeComponent.setState.callCount;

      var onError = $.ajax.args[0][0].error;
      onError({}, 503, 'foobar');

      expect(fakeComponent.setState.callCount).to.equal(prevCallCount);
    });

    it('should set isFetchingData to false in initial state', function() {
      var initialState = fakeComponent.getInitialState();

      expect(initialState.isFetchingData).to.equal(false);
    });

    it('should set dataError to null in initial state', function() {
      var initialState = fakeComponent.getInitialState();

      expect(initialState.dataError).to.equal(null);
    });

    describe('dataError set in this.state for failed requests', function() {
      var url = 'www.foo.bar',
          setStateArgs,
          err = {toString: sinon.stub()},
          xhrObj = {
            status: 404,
            statusText: 'Not found',
            responseText: '{"foo": "bar"}'
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

      it('should save the url of a failed request', function() {
        expect(setStateArgs.dataError.url).to.equal(url);
      });

      it('should save the statusCode of a failed request', function() {
        expect(setStateArgs.dataError.statusCode).to.equal(xhrObj.status);
      });

      it('should save the statusText of a failed request', function() {
        expect(setStateArgs.dataError.statusText).to.equal(xhrObj.status);
      });

      it('should save the message of a failed request', function() {
        expect(err.toString.callCount).to.equal(1);
      });

      it('should save the response of a failed request', function() {
        expect(setStateArgs.response).to.equal(xhrObj.responseJSON);
      });
    });

    describe('dataError should reset', function() {
      beforeEach(function() {
        fakeComponent.props.dataUrl = 'foo';

        fakeComponent.componentWillMount();

        var onError = $.ajax.args[0][0].error;
        ajaxStub.abort = function() {};
        onError({}, 404, 'foobar');
      });

      it('should reset dataError when refreshing data', function() {
        fakeComponent.refreshData();

        var setStateArgs = fakeComponent.setState.lastCall.args[0];

        expect(setStateArgs.dataError).to.equal(null);
      });

      it('should reset dataError when receiving new dataUrl', function() {
        fakeComponent.componentWillReceiveProps({
          dataUrl: 'bar'
        });

        var setStateArgs = fakeComponent.setState.lastCall.args[0];

        expect(setStateArgs.dataError).to.equal(null);
      });
    });

    describe('when stopping fetching', function() {
      var nativeClearInterval = clearInterval;

      beforeEach(function() {
        ajaxStub.abort = sinon.spy();

        fakeComponent.props.dataUrl = 'my-api.json';
        fakeComponent.componentWillMount();

        fakeComponent.stopFetching();
      });

      it('should abort ajax call', function() {
        expect(ajaxStub.abort).to.have.been.called;
      });
    });

    describe('polling', function() {
      var clock;

      beforeEach(function() {
        clock = sinon.useFakeTimers();
      });

      afterEach(function() {
        clock.restore();
      });

      describe('wtih simple dataUrl', function() {
        beforeEach(function() {
          fakeComponent.props.dataUrl = 'my-api.json';
        });

        describe('when poll interval is given', function() {
          beforeEach(function() {
            fakeComponent.props.pollInterval = _.random(1000, 5000);

            fakeComponent.componentWillMount();
          });

          it('should start polling after mounting', function() {
            $.ajax.reset();

            var times = _.random(2, 5);

            clock.tick(fakeComponent.props.pollInterval * times);

            expect($.ajax).to.have.callCount(times);
          });

          it('should poll the right URL', function() {
            $.ajax.reset();

            var times = _.random(2, 5);

            clock.tick(fakeComponent.props.pollInterval * times);

            expect($.ajax).to.have.always.been.calledWith(
                sinon.match.has('url', fakeComponent.props.dataUrl));
          });

          it('should stop polling when unmounting', function() {
            $.ajax.reset();

            fakeComponent.componentWillUnmount();

            var times = _.random(2, 5);

            clock.tick(fakeComponent.props.pollInterval * times);

            expect($.ajax).to.not.have.been.called;
          });

          it('should stop polling when receiving pollInterval=0', function() {
            $.ajax.reset();

            var times = _.random(2, 5),
                oldInterval = fakeComponent.props.pollInterval;

            fakeComponent.componentWillReceiveProps(
                _.merge({}, fakeComponent.props, {pollInterval: 0}));

            clock.tick(oldInterval * times);

            expect($.ajax).to.not.have.been.called;
          });

          it('should restart polling when receiving a new poll interval',
             function() {
            $.ajax.reset();

            var times = _.random(2, 5),
                oldInterval = fakeComponent.props.pollInterval,
                newInterval = oldInterval * 2;

            fakeComponent.componentWillReceiveProps(
                _.merge({}, fakeComponent.props, {pollInterval: newInterval}));

            clock.tick(newInterval * times);

            expect($.ajax).to.have.callCount(times);
          });

          it('should stop polling when told to do so', function() {
            $.ajax.reset();

            fakeComponent.stopPolling();

            clock.tick(fakeComponent.props.pollInterval);

            expect($.ajax).to.not.have.been.called;
          });

          it('should start polling when told to resume', function() {
            $.ajax.reset();
            fakeComponent.stopPolling();
            fakeComponent.resumePolling();

            var times = _.random(2, 5);

            clock.tick(fakeComponent.props.pollInterval * times);

            expect($.ajax).to.have.callCount(times);
          });

          it('should only poll once if told to resume multiple times',
             function() {
            $.ajax.reset();
            fakeComponent.stopPolling();

            _.times(_.random(2, 5), fakeComponent.resumePolling, fakeComponent);

            var times = _.random(2, 5);

            clock.tick(fakeComponent.props.pollInterval * times);

            expect($.ajax).to.have.callCount(times);
          });

          it('should poll the new URL when receiving one', function() {
            $.ajax.reset();

            var times = _.random(2, 5),
                interval = _.random(1000, 5000),
                oldUrl = fakeComponent.props.dataUrl,
                newUrl = oldUrl + 'new';

            fakeComponent.componentWillReceiveProps(
                _.merge({}, fakeComponent.props, {dataUrl: newUrl}));

            clock.tick(interval * times);

            expect($.ajax).to.have.always.been.calledWith(
                sinon.match.has('url', newUrl));
          });
        });

        describe('when poll interval is not given', function() {
          beforeEach(function() {
            fakeComponent.props.pollInterval = 0;

            fakeComponent.componentWillMount();
          });

          it('should not start polling after mounting', function() {
            $.ajax.reset();

            var times = _.random(2, 5);

            clock.tick(fakeComponent.props.pollInterval * times);

            expect($.ajax).to.not.have.been.called;
          });

          it('should start polling when receiving a poll interval', function() {
            $.ajax.reset();

            var times = _.random(2, 5),
                interval = _.random(1000, 5000);

            fakeComponent.componentWillReceiveProps(
                _.merge({}, fakeComponent.props, {pollInterval: interval}));

            clock.tick(interval * times);

            expect($.ajax).to.have.callCount(times);
          });
        });
      });

      describe('with custom dataUrl', function() {
        beforeEach(function() {
          fakeComponent.getDataUrl = sinon.stub().returns('foobar.json');
          fakeComponent.props.pollInterval = _.random(1000, 5000);

          fakeComponent.componentWillMount();
        });

        it('should poll the right URL', function() {
          $.ajax.reset();

          var times = _.random(2, 5);

          clock.tick(fakeComponent.props.pollInterval * times);

          expect(fakeComponent.getDataUrl).to.have.been.calledWith(
              fakeComponent.props);

          expect($.ajax).to.have.always.been.calledWith(
              sinon.match.has('url', 'foobar.json'));
        });
      });
    });
  });

  describe('cross domain', function() {
    beforeEach(function() {
      _.assign(fakeComponent, DataFetch({crossDomain: true}));
    });

    it('should send cross-domain cookies', function() {
      fakeComponent.props.dataUrl = 'my-api.json';

      fakeComponent.componentWillMount();

      expect($.ajax).to.have.been.calledWith(
          sinon.match.has('xhrFields',
                          sinon.match.has('withCredentials', true)));
    });
  });

  describe('error callback', function() {
    var errorCallback, context;

    beforeEach(function() {
      errorCallback = sinon.spy();

      _.assign(fakeComponent, DataFetch({onError: errorCallback}));

      fakeComponent.props.dataUrl = 'my-api.json';

      fakeComponent.componentWillMount();

      context = {url: 'my-api.json'};

      $.ajax.args[0][0].error.call(
          context, {foo: 'bar'}, 42, 'foobared');

    });

    it('should call the error callback when a request errors', function() {
      expect(errorCallback).to.have.been.calledWith(
          {foo: 'bar'}, 42, 'foobared');
    });

    it('should call the error callback with the right context', function() {
      expect(errorCallback).to.have.been.calledOn(context);
    });
  });
});
