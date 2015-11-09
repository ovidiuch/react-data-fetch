var _ = require('lodash'),
    $ = require('jquery');

/**
 * Bare functionality for fetching server-side JSON data inside a React
 * component.
 * @typedef {Object} DataFetchMixin
 *
 * @param {String} dataUrl A URL to fetch data from. Once data is received it
 *     will be set inside the component's state, under the data key, and will
 *     cause a reactive re-render.
 * @param {Number} [pollInterval=0] An interval in milliseconds for polling the
 *     data URL. 0 means no polling.
 *
 * @param {Function} getDataUrl The data URL can be generated dynamically by
 *     composing it using other props, inside a custom method that receives the
 *     next props as arguments and returns the data URL. The expected method
 *     name is "getDataUrl" and overrides the dataUrl prop when implemented.
 */

/**
 * @param {Object} [options]
 * @param {Bool} [options.crossDomain=false] If `true`, the requests will
 *     contain the cookies set for the other domain.
 * @param {Function} [onError] If given, it will be called whenever a request
 *     fails. See http://devdocs.io/jquery/jquery.ajax for details on what
 *     params will be passed.
 *
 * @returns {DataFetchMixin}
 */
module.exports = function(options) {
  options = options || {};

  _.defaults(options, {
    crossDomain: false,
    onError: function() {}
  });

  return {
    getDefaultProps: function() {
      return {
        // Enable polling by setting a value bigger than zero, in ms
        pollInterval: 0
      };
    },

    getInitialState: function() {
      return {
        isFetchingData: false,
        dataError: null
      };
    },

    componentWillMount: function() {
      this._xhrRequests = [];

      // The dataUrl prop points to a source of data than will extend the initial
      // state of the component, once it will be fetched
      this._resetData(this.props);

      if (this._shouldWePoll(this.props)) {
        this._startPolling(this.props);
      }
    },

    componentWillReceiveProps: function(nextProps) {
      /**
       * A component can have its configuration replaced at any time so we need
       * to fetch data again. We may also need to reset/stop polling.
       */
      var dataUrlChanged = this.props.dataUrl !== nextProps.dataUrl,
          pollIntervalChanged = this.props.pollInterval !==
              nextProps.pollInterval;

      if (dataUrlChanged || pollIntervalChanged) {
        this._clearPolling();

        if (dataUrlChanged) {
          this._resetData(nextProps);
        }

        if (this._shouldWePoll(nextProps)) {
          this._startPolling(nextProps);
        }
      }
    },

    componentWillUnmount: function() {
      // We abort any on-going requests when unmounting to make sure their
      // callbacks will no longer be called. The error callback will still be
      // called because of the abort action itself, so we use this flag to know
      // to ignore it altogether from this point on
      this._ignoreXhrRequestCallbacks = true;

      this._clearDataRequests();

      this._clearPolling();
    },

    refreshData: function() {
      /**
       * Hit the same data URL again.
       */
      this._resetData(this.props);
    },

    stopFetching: function() {
      this._clearDataRequests();
    },

    stopPolling: function() {
      this._clearPolling();
    },

    resumePolling: function() {
      this._clearPolling();
      this._startPolling(this.props);
    },

    receiveDataFromServer: function(data) {
      this.setState({
        isFetchingData: false,
        data: data
      });
    },

    _resetData: function(props) {
      /**
       * Hit the dataUrl and fetch data.
       *
       * Before starting to fetch data we reset any ongoing requests.
       *
       * @param {Object} props
       * @param {String} props.dataUrl The URL that will be hit for data. The URL
       *     can be generated dynamically by composing it through other props,
       *     inside a custom method that receives the next props as arguments and
       *     returns the data URL. The expected method name is "getDataUrl" and
       *     overrides the dataUrl prop when implemented
       */
      var dataUrl = this._getDataUrl(props);

      this._clearDataRequests();

      if (dataUrl) {
        this._fetchDataFromServer(dataUrl, this.receiveDataFromServer);
      }
    },

    _clearDataRequests: function() {
      // Cancel any on-going request.
      while (!_.isEmpty(this._xhrRequests)) {
        this._xhrRequests.pop().abort();
      }
    },

    _startPolling: function(props) {
      var url = this._getDataUrl(props);

      var callback = function() {
        this._fetchDataFromServer(url, this.receiveDataFromServer);
      };

      this._pollInterval = setInterval(callback.bind(this), props.pollInterval);
    },

    _clearPolling: function() {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    },

    _getDataUrl: function(props) {
      return typeof(this.getDataUrl) === 'function' ?
          this.getDataUrl(props) : props.dataUrl;
    },

    _fetchDataFromServer: function(url, onSuccess) {
      this.setState({
        isFetchingData: true,
        dataError: null
      });

      var request,
          onComplete,
          onError;

      onComplete = function() {
        this._xhrRequests = _.without(this._xhrRequests, request);
      };

      onError = function(xhr, status, err) {
        if (this._ignoreXhrRequestCallbacks) {
          return;
        }

        this.setState({
          isFetchingData: false,
          dataError: {
            url: url,
            statusCode: xhr.status,
            statusText: status,
            message: err.toString()
          }
        });

        options.onError.apply(this, arguments);
      };

      request = $.ajax({
        url: url,
        // Even though not recommended, some $.ajaxSettings might default to
        // POST requests. See http://api.jquery.com/jquery.ajaxsetup/
        type: 'GET',
        dataType: 'json',
        xhrFields: {
          withCredentials: options.crossDomain
        },
        complete: onComplete.bind(this),
        success: onSuccess,
        error: onError.bind(this)
      });

      this._xhrRequests.push(request);
    },

    _shouldWePoll: function(props) {
      return props.pollInterval > 0;
    }
  };
};
