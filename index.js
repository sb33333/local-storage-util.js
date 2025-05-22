"use strict";

(function() {
	if (globalThis["LocalStorageUtil"]) return;
	var DEBUG = false;
	var setValue = (key, val, context = null, validDate) => {
		var entryValue = {
			value: val,
			context,
			validTime: (validDate instanceof Date ? validDate.getTime() : null)
		}
		localStorage.setItem(key, JSON.stringify(entryValue));
	}
	
	var getValue = (key) => {
		var o = _getObject(key);
		return _proto.isPrototypeOf(o) ? o.value : o;
	}
	
	var _proto = {
		checkContext: function () {
			var {pathname} = location;
			var {context} = this;
			if(context) {
				var split=context.split("/").filter(path => path);
				var pathnameSplit = pathname.split("/").filter(path => path);
				if (pathnameSplit.length < split.length) return false;
				return split.every((path, index) => path === pathnameSplit[index]);
			} else {
				return true;
			}
		},
		checkExpireDate: function() {
			var {validTime} = this;
			var now = (new Date()).getTime();
			return (validTime ? validTime >= now : true);
		},
		isValid: function () {
			return this.checkContext() && this.checkExpireDate();
		},
		get value () {
			return (this.isValid() ? this._value : null);
		},
		set value (val) {
			this._value = val;
		}
	}
	
	var _getObject = (key) => {
		var obj = null;
		try {
			obj = JSON.parse(localStorage.getItem(key));
		} catch {
			if(DEBUG) console.debug(`localStorage['${key}'] is unparsable json format.`);
			return localStorage.getItem(key) || null;
		}
		
		if (obj && obj.hasOwnProperty("value") && obj.hasOwnProperty("context") && obj.hasOwnProperty("validTime")) {
			var o = Object.create(_proto);
			o = Object.assign(o, obj);
			return o;
		} else {
			return obj;
		}
	}
	
	var removeValue = (key) => {
		return (localStorage[key] ? localStorage.removeItem(key) || true : false);
	}
	
	var getDate = (sec, min, hour) => {
		var d = new Date();
		if (sec) d.setSeconds(d.getSeconds() + sec);
		if (min) d.setMinutes(d.getMinutes() + min);
		if (hour) d.setHours(d.getHours() + hour);
		return d;
	}
	
	var _entries = () => Object.keys(localStorage).map(key => [key, _getObject(key)]);
	var entries = () => _entries().filter(entry => {
		var [_, obj] = entry;
		return (obj.isValid ? obj.isValid() : true);
	});
	
	var keys = () => entries().map(entry => entry[0]);
	var values = () => entries().map(entry => entry[1]);
	
	var _refresh = () => {
		var before = _entries();
		before.forEach(entry => {
			var [key, value] = entry;
			if (value.checkExpireDate && !value.checkExpireDate()) removeValue(key);
		});
		if (DEBUG) {
			var after = _entries();
			console.debug(before, after);
		}
	}
	
	window.addEventListener("beforeunload", _refresh);
	
	var methods = {
		setValue,
		getValue,
		removeValue,
		getDate,
		keys,
		values,
		entries,
		enableDebug: (bool) => {DEBUG = (bool ? true : false)},
	}
	globalThis["LocalStorageUtil"] = methods;
}) ();
