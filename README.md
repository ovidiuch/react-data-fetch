# react-data-fetch [![Build Status](https://travis-ci.org/skidding/react-data-fetch.svg?branch=master)](https://travis-ci.org/skidding/react-data-fetch)
A good-enough data fetching mixin for React components. No models, no stores,
just data.

Bare functionality for fetching server-side JSON data inside a React omponent.
Uses basic Ajax requests and setInterval for polling.

```js
{
  "component": "List",
  "dataUrl": "/api/users.json",
  // Refresh users every 5 seconds
  "pollInterval": 5000
}
```

Props:

- **dataUrl** - A URL to fetch data from. Once data is received it will be set
                inside the component's _state_, under the `data` key, and will
                cause a reactive re-render.
- **pollInterval** - An interval in milliseconds for polling the data URL.
                     Defaults to 0, which means no polling.

Context methods:

- **getDataUrl**: The data URL can be generated dynamically by composing it
                  using other props, inside a custom method that receives
                  the next props as arguments and returns the data URL. The
                  expected method name is "getDataUrl" and overrides the
                  dataUrl prop when implemented.

The DataFetch mixin introduces a jQuery dependency, its built-in JSONP support
is worth the money.
