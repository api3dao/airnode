const { defineProperty } = Object;
Object.defineProperty = function (object, name, meta) {
  if (meta.get && !meta.configurable) {
    // it might be an ES6 exports object
    return defineProperty(object, name, {
      ...meta,
      configurable: true, // prevent freezing
    });
  }

  return defineProperty(object, name, meta);
};
