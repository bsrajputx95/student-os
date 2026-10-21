export function runPracticeCode(payload, {
  signal,
  timeout = 4000
} = {}) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe'),
      id = crypto.randomUUID();
    frame.hidden = true;
    frame.title = 'Isolated practice execution';
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.src = '/practice-runner.html';
    let timer,
      finished = false;
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('message', message);
      signal?.removeEventListener('abort', abort);
      frame.remove();
    };
    const end = (error, result) => {
      if (finished) return;
      finished = true;
      cleanup();
      error ? reject(new Error(error)) : resolve(result);
    };
    const abort = () => end('This practice run was cancelled.');
    const message = event => {
      if (event.source !== frame.contentWindow) return;
      if (event.data?.type === 'studentos-practice-ready') frame.contentWindow.postMessage({
        type: 'studentos-practice-run',
        id,
        payload
      }, '*');else if (event.data?.type === 'studentos-practice-result' && event.data.id === id) {
        if (event.data.error) end(event.data.error);else if (Array.isArray(event.data.results)) end(null, event.data.results);else end('The runner returned an invalid result.');
      }
    };
    window.addEventListener('message', message);
    signal?.addEventListener('abort', abort, {
      once: true
    });
    timer = setTimeout(() => end('The practice run exceeded its time limit. Check for an infinite loop.'), timeout);
    if (signal?.aborted) {
      abort();
      return;
    }
    document.body.append(frame);
  });
}
