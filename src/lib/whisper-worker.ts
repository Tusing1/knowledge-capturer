import { pipeline, env } from '@xenova/transformers';

// Skip local model check since we are running in the browser
env.allowLocalModels = false;

let transcriber: any = null;

self.addEventListener('message', async (e) => {
  if (e.data.type === 'load') {
    if (!transcriber) {
      try {
        transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
        self.postMessage({ type: 'loaded' });
      } catch (err) {
        self.postMessage({ type: 'error', error: String(err) });
      }
    }
  } else if (e.data.type === 'transcribe') {
    if (!transcriber) return;
    const { audioData, chunkIndex } = e.data;
    try {
      const output = await transcriber(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'en',
        task: 'transcribe',
      });
      self.postMessage({ type: 'result', text: output.text, chunkIndex });
    } catch (err) {
      self.postMessage({ type: 'error', error: String(err), chunkIndex });
    }
  }
});
