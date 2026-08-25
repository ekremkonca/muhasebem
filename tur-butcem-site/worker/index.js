import handler from 'vinext/server/app-router-entry';

export default {
  fetch(request) {
    return handler.fetch(request);
  }
};
