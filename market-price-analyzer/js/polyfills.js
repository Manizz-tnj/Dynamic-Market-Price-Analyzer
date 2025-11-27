/**
 * Browser Compatibility Polyfills
 * Ensures all modern JavaScript features work across different browsers
 */

// Console polyfill for older browsers
if (!window.console) {
    window.console = {
        log: function() {},
        error: function() {},
        warn: function() {},
        info: function() {}
    };
}

// Array.from polyfill
if (!Array.from) {
    Array.from = function(arrayLike) {
        var result = [];
        for (var i = 0; i < arrayLike.length; i++) {
            result.push(arrayLike[i]);
        }
        return result;
    };
}

// Array.includes polyfill
if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement) {
        return this.indexOf(searchElement) !== -1;
    };
}

// String.includes polyfill
if (!String.prototype.includes) {
    String.prototype.includes = function(search, start) {
        if (typeof start !== 'number') {
            start = 0;
        }
        return this.indexOf(search, start) !== -1;
    };
}

// String.startsWith polyfill
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.substr(position, searchString.length) === searchString;
    };
}

// String.endsWith polyfill
if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(searchString, length) {
        if (typeof length === 'undefined' || length > this.length) {
            length = this.length;
        }
        return this.substring(length - searchString.length, length) === searchString;
    };
}

// Object.assign polyfill
if (!Object.assign) {
    Object.assign = function(target) {
        if (target == null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }
        target = Object(target);
        for (var index = 1; index < arguments.length; index++) {
            var source = arguments[index];
            if (source != null) {
                for (var key in source) {
                    if (Object.prototype.hasOwnProperty.call(source, key)) {
                        target[key] = source[key];
                    }
                }
            }
        }
        return target;
    };
}

// Promise polyfill for older browsers
if (!window.Promise) {
    window.Promise = function(executor) {
        var self = this;
        this.state = 'pending';
        this.value = undefined;
        this.handlers = [];
        
        function resolve(value) {
            if (self.state === 'pending') {
                self.state = 'resolved';
                self.value = value;
                self.handlers.forEach(handle);
            }
        }
        
        function reject(reason) {
            if (self.state === 'pending') {
                self.state = 'rejected';
                self.value = reason;
                self.handlers.forEach(handle);
            }
        }
        
        function handle(handler) {
            if (self.state === 'pending') {
                self.handlers.push(handler);
            } else {
                if (self.state === 'resolved' && typeof handler.onResolve === 'function') {
                    handler.onResolve(self.value);
                }
                if (self.state === 'rejected' && typeof handler.onReject === 'function') {
                    handler.onReject(self.value);
                }
            }
        }
        
        this.then = function(onResolve, onReject) {
            return new Promise(function(resolve, reject) {
                handle({
                    onResolve: function(result) {
                        try {
                            resolve(onResolve ? onResolve(result) : result);
                        } catch (ex) {
                            reject(ex);
                        }
                    },
                    onReject: function(error) {
                        try {
                            resolve(onReject ? onReject(error) : Promise.reject(error));
                        } catch (ex) {
                            reject(ex);
                        }
                    }
                });
            });
        };
        
        this.catch = function(onReject) {
            return this.then(null, onReject);
        };
        
        executor(resolve, reject);
    };
}

// Fetch polyfill for older browsers
if (!window.fetch) {
    window.fetch = function(url, options) {
        return new Promise(function(resolve, reject) {
            var request = new XMLHttpRequest();
            options = options || {};
            
            request.open(options.method || 'GET', url, true);
            
            // Set headers
            if (options.headers) {
                for (var key in options.headers) {
                    request.setRequestHeader(key, options.headers[key]);
                }
            }
            
            request.onload = function() {
                var response = {
                    ok: request.status >= 200 && request.status < 300,
                    status: request.status,
                    statusText: request.statusText,
                    json: function() {
                        return Promise.resolve(JSON.parse(request.responseText));
                    },
                    text: function() {
                        return Promise.resolve(request.responseText);
                    }
                };
                resolve(response);
            };
            
            request.onerror = function() {
                reject(new Error('Network Error'));
            };
            
            request.send(options.body);
        });
    };
}

// URL.createObjectURL polyfill
if (!window.URL || !window.URL.createObjectURL) {
    window.URL = window.URL || {};
    window.URL.createObjectURL = function(blob) {
        // Fallback for very old browsers
        return 'data:application/octet-stream;base64,' + btoa(blob);
    };
    window.URL.revokeObjectURL = function(url) {
        // No-op for fallback
    };
}

// classList polyfill for older browsers
if (!Element.prototype.classList) {
    Element.prototype.classList = {
        add: function(className) {
            if (!this.contains(className)) {
                this.className += ' ' + className;
            }
        },
        remove: function(className) {
            this.className = this.className.replace(new RegExp('\\b' + className + '\\b', 'g'), '');
        },
        contains: function(className) {
            return new RegExp('\\b' + className + '\\b').test(this.className);
        },
        toggle: function(className) {
            if (this.contains(className)) {
                this.remove(className);
            } else {
                this.add(className);
            }
        }
    };
}

// addEventListener polyfill for IE8
if (!Element.prototype.addEventListener) {
    Element.prototype.addEventListener = function(event, handler, capture) {
        this.attachEvent('on' + event, handler);
    };
    Element.prototype.removeEventListener = function(event, handler, capture) {
        this.detachEvent('on' + event, handler);
    };
}

// querySelector polyfill for older browsers
if (!document.querySelector) {
    document.querySelector = function(selector) {
        var elements = document.querySelectorAll(selector);
        return elements.length > 0 ? elements[0] : null;
    };
}

if (!document.querySelectorAll) {
    document.querySelectorAll = function(selector) {
        var style = document.createElement('style');
        var elements = [];
        document.documentElement.firstChild.appendChild(style);
        document._qsa = [];
        
        style.styleSheet.cssText = selector + '{x-qsa:expression(document._qsa && document._qsa.push(this))}';
        window.scrollBy(0, 0);
        style.parentNode.removeChild(style);
        
        var result = document._qsa;
        document._qsa = null;
        return result;
    };
}

// Custom event support for older browsers
if (!window.CustomEvent) {
    function CustomEvent(event, params) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
    }
    CustomEvent.prototype = window.Event.prototype;
    window.CustomEvent = CustomEvent;
}

// JSON polyfill for very old browsers
if (!window.JSON) {
    window.JSON = {
        parse: function(text) {
            return eval('(' + text + ')');
        },
        stringify: function(obj) {
            if (obj === null) return 'null';
            if (typeof obj === 'undefined') return undefined;
            if (typeof obj === 'string') return '"' + obj.replace(/"/g, '\\"') + '"';
            if (typeof obj === 'number' || typeof obj === 'boolean') return obj.toString();
            if (obj instanceof Array) {
                var arr = [];
                for (var i = 0; i < obj.length; i++) {
                    arr.push(JSON.stringify(obj[i]));
                }
                return '[' + arr.join(',') + ']';
            }
            if (typeof obj === 'object') {
                var pairs = [];
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        pairs.push(JSON.stringify(key) + ':' + JSON.stringify(obj[key]));
                    }
                }
                return '{' + pairs.join(',') + '}';
            }
        }
    };
}

console.log('✅ Browser compatibility polyfills loaded');