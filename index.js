/**
* @module LocalStorageUtil
* @description
* 이 모듈은 {@code localStorage}에 저장된 데이터에 대해 다음과 같은 기능을 제공합니다.
* <ul>
* <li>key-value 저장/조회/삭제</li>
* <li>만료 시간 설정 및 만료 시간이 경과한 데이터 삭제.</li>
* <li>특정 경로(context)에 대한 유효성 제한</li>
* <li>유효한 항목만 필터링하여 조회</li>
* </ul>
*/
"use strict";
(function() {
	if (globalThis["LocalStorageUtil"]) return;
	// define classes
	class EntryValue {
		constructor (val) {
			this.value = val;
		}
		checkContext() { throw new Error("not implemented."); }
		checkExpireDate() { throw new Error("not implemented."); }
		isValid() { throw new Error("not implemented."); }
		get value() {
			return (this.isValid() ? this._value : null);
		}
		set value(val) {
			this._value = val;
		}
	}
	class PlainEntryValue extends EntryValue {
		constructor(val) {
			super(val);
		}
		checkContext () { return true; }
		checkExpireDate () { return true; }
		isValid () { return true; }
	}
	class CustomEntryValue extends EntryValue {
		constructor (val, context, validTime) {
			super(val);
			this._context = context;
			this._validTime = validTime;
		}
		checkContext () {
			var {pathname} = globalThis.location;
			var {_context} = this;
			if (!_context) return true;
			
			var split = _context.split("/").filter(path => path);
			var pathnameSplit = pathname.split("/").filter(path => path);
			if (pathnameSplit.length < split.length) return false;
			return split.every((path, index) => path === pathnameSplit[index]);
		}
		checkExpireDate () {
			var {_validTime} = this;
			if (!_validTime) return true;
			
			var now = (new Date()).getTime();
			return _validTime >= now;
		}
		isValid () {
			return this.checkContext() && this.checkExpireDate();
		}
	}
	
	var DEBUG = false;
	var setValue = (key, val, context = null, validDate) => {
		var _timeMillis = null;
		if (typeof validDate === "number") {
			_timeMillis = validDate
		} else if (validDate instanceof Date) {
			_timeMillis = validDate.getTime();
		} else {
			_timeMillis = null;
		}
		var entryValue = {
			value: val,
			context,
			validTime: _timeMillis
		}
		localStorage.setItem(key, JSON.stringify(entryValue));
	}
	
	var getValue = (key) => {
		var o = _getEntryValueObject(key);
		return o.value;
	}
	
	var _getEntryValueObject = (key) => {
		var obj = null;
		try {
			obj = JSON.parse(localStorage.getItem(key));
		} catch {
			if(DEBUG) console.debug(`localStorage['${key}'] is unparsable json format.`);
			return new PlainEntryValue(localStorage.getItem(key));
		}
		
		if (obj && obj.hasOwnProperty("value") && obj.hasOwnProperty("context") && obj.hasOwnProperty("validTime")) {
			var {value, context, validTime} = obj;
			return new CustomEntryValue(value, context, validTime);
		} else {
			return new PlainEntryValue(obj);
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
	
	var _entries = () => Object.keys(localStorage).map(key => [key, _getEntryValueObject(key)]);
	var entries = () => _entries()
	.filter(entry => {
		var [_, entryValueObject] = entry;
		return entryValueObject.isValid();
	})
	.map(entry => {
		var [key, entryValueObject] = entry;
		return [key, entryValueObject.value];
	});
	
	var keys = () => entries().map(entry => entry[0]);
	var values = () => entries().map(entry => entry[1]);
	
	var _refresh = () => {
		var before = _entries();
		before.forEach(entry => {
			var [key, entryValueObject] = entry;
			if (!entryValueObject.checkExpireDate()) removeValue(key);
		});
		if (DEBUG) {
			var after = _entries();
			console.debug(before, after);
		}
	}
	
	window.addEventListener("beforeunload", _refresh);
	
	var methods = {
		/**
		* 로컬 에 값을 저장합니다.
		* @param {string} key
		* @param {any} val
		* @param {string | null} context 경로 제한 조건(해당 경로로 시작할 경우에만 유효)
		* @param {Date} validDate 값의 만료 일시
		*/
		setValue,
		/**
		* 로컬 스토리지에서 값을 가져옵니다. context 및 만료일 조건이 충족되지 않으면 null을 반환합니다.
		* @param {string} key
		* @return {any} 저장된 값 또는 null
		*/
		getValue,
		/**
		* 로컬 스토리지에서 특정 키를 삭제합니다.
		* @param {string} key
		* @return {boolean} 삭제 성공 여부. key에 해당하는 값이 없으면 false를 반환합니다.
		*/
		removeValue,
		/**
		* 현재 시각 기준으로 지정된 시간만큼 더한 Date 객체를 반환합니다.
		* @param {number} sec 초 단위 추가
		* @param {number} min 분 단위 추가
		* @param {number} hour 시간 단위 추가
		* @return {Date} 계산된 시각의 Date 객체
		*/
		getDate,
		/**
		* 유효한 항목들(localStorage 내 유효성 조건을 만족하는 항목)의 키 목록을 반환합니다.
		* @return {Array} 유효한 key 목록
		*/
		keys,
		/**
		* 유효한 항목들(localStorage 내 유효성 조건을 만족하는 항목)의 값 목록을 반환합니다.
		* @return {Array} 유효한 value 목록
		*/
		values,
		/**
		* 유효한 항목들(localStorage 내 유효성 조건을 만족하는 항목)의 [key, value]쌍 목록을 반환합니다.
		* @return {Array} 유효한 [key, value] 목록
		*/
		entries,
		/**
		* 디버그 로그 출력을 설정합니다.
		* @param {any} bool true로 설정 시 디버그 모드 활성화
		*/
		enableDebug: (bool) => {DEBUG = (bool ? true : false)},
	}
	globalThis["LocalStorageUtil"] = methods;
}) ();

// test code
(function () {
	function doTest (supplier, predicate) {
		try {
			var result = supplier();
			var testResult = predicate(result);
			if (!testResult) {
				throw new Error (`test failed.\nresult:${result}\nexpected:${predicate}`);
			}
		} catch (ex) {
			console.error(ex);
		}
	}
	setTimeout(function() {
		console.group("Test result");
		// setup
		const TEST_VALUE = "testValue";
		LocalStorageUtil.setValue("@testKey", TEST_VALUE);
		LocalStorageUtil.setValue("@testKey2", TEST_VALUE, "/not/valid/context");
		LocalStorageUtil.setValue("@testKey3", TEST_VALUE, null, LocalStorageUtil.getDate(-1));
		
		// s: test cases
		doTest(
			() => LocalStorageUtil.getValue("@testKey"),
			(result) => result === TEST_VALUE
		);
		
		doTest(
			() => LocalStorageUtil.getValue("@testKey2"),
			(result) => result === null
		);
		
		var pathname = globalThis?.location?.pathname;
		if(pathname) {
			LocalStorageUtil.setValue("@testKey2", TEST_VALUE, pathname);
			doTest(
				() => LocalStorageUtil.getValue("@testKey2"),
				result => result === TEST_VALUE
			);
		}
		
		doTest(
			()=>LocalStorageUtil.keys(),
			function(result) {
				return result.includes("@testkey");
			}
		);
		
		doTest(
			() => LocalStorageUtil.keys(),
			result => !result.includes("@testKey3")
		);
		
		doTest(
			() => {
				var testVal = "temp;
				LocalStorageUtil.setValue("@temp_testKey", testVal);
				var value = LocalStorageUtil.getValue("@temp_testKey");
				if (value !== testVal) throw new Error(`value("${value}") should be equals to "${testVal}"`);
				LocalStorageUtil.removeValue("@temp_testKey");
				return LocalStorageUtil.getValue("@temp_testKey");
			},
			result => result === null
		);
		// e: test cases
		
		// tear down
		LocalStorageUtil.removeValue("@testKey");
		LocalStorageUtil.removeValue("@testKey2");
		LocalStorageUtil.removeValue("@testKey3");
		LocalStorageUtil.removeValue("@temp_testKey");
		console.groupEnd();
	}, 0);
})();
