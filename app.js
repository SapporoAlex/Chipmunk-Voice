let mediaRecorder;
let audioChunks = [];
let audioContext = new AudioContext();
let recordedBlob = null;

const recordBtn = document.getElementById("recordBtn");
const playBtn = document.getElementById("playBtn");

async function initRecorder() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = event => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    recordedBlob = new Blob(audioChunks, { type: "audio/webm" });
    audioChunks = [];
    saveToIndexedDB(recordedBlob);
  };
}

recordBtn.onclick = async () => {
  if (!mediaRecorder) await initRecorder();

  if (mediaRecorder.state === "inactive") {
    mediaRecorder.start();
    recordBtn.textContent = "⏹ Stop";
  } else {
    mediaRecorder.stop();
    recordBtn.textContent = "🎙 Record";
  }
};

playBtn.onclick = async () => {
  if (!recordedBlob) {
    recordedBlob = await loadFromIndexedDB();
  }

  if (!recordedBlob) return;

  const arrayBuffer = await recordedBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  // CHIPMUNK EFFECT
  source.playbackRate.value = 1.8;

  source.connect(audioContext.destination);
  source.start();
};

function saveToIndexedDB(blob) {
  const request = indexedDB.open("chipmunkDB", 1);

  request.onupgradeneeded = event => {
    const db = event.target.result;
    db.createObjectStore("audioStore");
  };

  request.onsuccess = event => {
    const db = event.target.result;
    const tx = db.transaction("audioStore", "readwrite");
    const store = tx.objectStore("audioStore");
    store.put(blob, "latest"); // overwrites previous
  };
}

function loadFromIndexedDB() {
  return new Promise(resolve => {
    const request = indexedDB.open("chipmunkDB", 1);

    request.onsuccess = event => {
      const db = event.target.result;
      const tx = db.transaction("audioStore", "readonly");
      const store = tx.objectStore("audioStore");
      const getRequest = store.get("latest");

      getRequest.onsuccess = () => {
        resolve(getRequest.result);
      };
    };
  });
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
