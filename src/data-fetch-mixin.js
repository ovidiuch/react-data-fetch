// Works with Node and browser globals
(function(root, factory) {
  if (typeof exports === 'object') {
    module.exports = factory(require('lodash'), require('jquery'));
  } else {
    root.DataFetchMixin = factory(root._, root.$);
  }
}(this, function(_, $) {

return {
  /**
   * Bare functionality for fetching server-side JSON data inside a React
   * component.
   *
   * Props:
   *   - dataUrl: A URL to fetch data from. Once data is received it will be
   *              set inside the component's state, under the data key, and
   *              will cause a reactive re-render.
   *   - pollInterval: An interval in milliseconds for polling the data URL.
   *                   Defaults to 0, which means no polling.
   *
   * Context methods:
   *  - getDataUrl: The data URL can be generated dynamically by composing it
   *                using other props, inside a custom method that receives
   *                the next props as arguments and returns the data URL. The
   *                expected method name is "getDataUrl" and overrides the
   *                dataUrl prop when implemented.
   */
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
  },

  componentWillReceiveProps: function(nextProps) {
    /**
     * A component can have its configuration replaced at any time so we need
     * to fetch data again.
     *
     * Only fetch data if the dataUrl has changed.
     */
    if (this.props.dataUrl !== nextProps.dataUrl) {
      this._resetData(nextProps);
    }
  },

  componentWillUnmount: function() {
    // We abort any on-going requests when unmounting to make sure their
    // callbacks will no longer be called. The error callback will still be
    // called because of the abort action itself, so we use this flag to know
    // to ignore it altogether from this point on
    this._ignoreXhrRequestCallbacks = true;

    this._clearDataRequests();
  },

  refreshData: function() {
    /**
     * Hit the same data URL again.
     */
    this._resetData(this.props);
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
     * Before starting to fetch data we reset any ongoing requests. We also
     * reset the polling interval.
     *
     * @param {Object} props
     * @param {String} props.dataUrl The URL that will be hit for data. The URL
     *     can be generated dynamically by composing it through other props,
     *     inside a custom method that receives the next props as arguments and
     *     returns the data URL. The expected method name is "getDataUrl" and
     *     overrides the dataUrl prop when implemented
     */
    var dataUrl = typeof(this.getDataUrl) === 'function' ?
                  this.getDataUrl(props) :
                  props.dataUrl;

    // Clear any on-going polling when data is reset. Even if polling is still
    // enabled, we need to reset the interval to start from now
    this._clearDataRequests();

    if (dataUrl) {
      this._fetchDataFromServer(dataUrl, this.receiveDataFromServer);

      if (props.pollInterval) {
        var callback = function() {
          this._fetchDataFromServer(dataUrl, this.receiveDataFromServer);
        };

        this._pollInterval = setInterval(callback.bind(this),
                                         props.pollInterval);
      }
    }
  },

  _clearDataRequests: function() {
    // Cancel any on-going request and future polling
    while (!_.isEmpty(this._xhrRequests)) {
      this._xhrRequests.pop().abort();
    }

    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
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
    };

    request = $.ajax({
      url: url,
      // Even though not recommended, some $.ajaxSettings might default to POST
      // requests. See http://api.jquery.com/jquery.ajaxsetup/
      type: 'GET',
      dataType: 'json',
      complete: onComplete.bind(this),
      success: onSuccess,
      error: onError.bind(this)
    });

    this._xhrRequests.push(request);
  }
};

}));
