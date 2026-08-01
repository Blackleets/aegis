export const MOBILE_NOTIFICATION_GUARD_SCRIPT = String.raw`
(() => {
  if (typeof window === 'undefined') return;

  const isMobile = Boolean(
    navigator.userAgentData?.mobile
    || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent),
  );

  if ('Notification' in window) {
    const NativeNotification = window.Notification;

    if (isMobile && typeof NativeNotification === 'function') {
      function SafeMobileNotification() {
        return {
          close() {},
          onclick: null,
          onshow: null,
          onerror: null,
          onclose: null,
        };
      }

      Object.defineProperty(SafeMobileNotification, 'permission', {
        configurable: true,
        get: () => NativeNotification.permission,
      });

      if (typeof NativeNotification.requestPermission === 'function') {
        SafeMobileNotification.requestPermission = NativeNotification.requestPermission.bind(NativeNotification);
      }

      window.Notification = SafeMobileNotification;
    }
  }

  try {
    const storage = window.localStorage;
    const prototype = Object.getPrototypeOf(storage);

    if (prototype && !prototype.__aegisStorageGuarded) {
      const nativeGetItem = prototype.getItem;
      const nativeSetItem = prototype.setItem;
      const nativeRemoveItem = prototype.removeItem;

      if (typeof nativeGetItem === 'function') {
        prototype.getItem = function aegisSafeGetItem(key) {
          try {
            return nativeGetItem.call(this, key);
          } catch {
            return null;
          }
        };
      }

      if (typeof nativeSetItem === 'function') {
        prototype.setItem = function aegisSafeSetItem(key, value) {
          try {
            nativeSetItem.call(this, key, value);
          } catch {
            // Persistence is optional; in-memory state remains authoritative.
          }
        };
      }

      if (typeof nativeRemoveItem === 'function') {
        prototype.removeItem = function aegisSafeRemoveItem(key) {
          try {
            nativeRemoveItem.call(this, key);
          } catch {
            // A failed cleanup must never interrupt the application.
          }
        };
      }

      Object.defineProperty(prototype, '__aegisStorageGuarded', {
        configurable: false,
        enumerable: false,
        value: true,
      });
    }
  } catch {
    // Some privacy modes throw while resolving localStorage itself.
  }

  const speech = window.speechSynthesis;
  if (speech) {
    if (typeof speech.cancel === 'function') {
      const nativeCancel = speech.cancel.bind(speech);
      speech.cancel = () => {
        try {
          nativeCancel();
        } catch {
          // Voice is optional. A failed cancellation must never affect navigation.
        }
      };
    }

    if (typeof speech.speak === 'function') {
      const nativeSpeak = speech.speak.bind(speech);
      speech.speak = (utterance) => {
        try {
          nativeSpeak(utterance);
        } catch {
          // Some mobile browsers expose speechSynthesis but reject speak().
        }
      };
    }
  }

  const NativeUtterance = window.SpeechSynthesisUtterance;
  if (typeof NativeUtterance === 'function') {
    function SafeSpeechSynthesisUtterance(text) {
      try {
        return new NativeUtterance(text);
      } catch {
        return {
          text: String(text ?? ''),
          lang: '',
          rate: 1,
          pitch: 1,
          volume: 1,
          onstart: null,
          onend: null,
          onerror: null,
          onpause: null,
          onresume: null,
          onmark: null,
          onboundary: null,
        };
      }
    }

    SafeSpeechSynthesisUtterance.prototype = NativeUtterance.prototype;
    window.SpeechSynthesisUtterance = SafeSpeechSynthesisUtterance;
  }
})();
`;
