import { useEffect, useRef, useState } from 'react';

export type ImageLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export type ImageState =
  | { status: 'idle' | 'loading'; image: null }
  | { status: 'ready'; image: HTMLImageElement }
  | { status: 'error'; image: null };

export function useImageAsset(url: string, onLoadStateChange?: (status: ImageLoadStatus) => void) {
  const [state, setState] = useState<ImageState>({ status: 'idle', image: null });
  const callbackRef = useRef(onLoadStateChange);

  useEffect(() => {
    callbackRef.current = onLoadStateChange;
  }, [onLoadStateChange]);

  useEffect(() => {
    if (!url) {
      setState({ status: 'idle', image: null });
      callbackRef.current?.('idle');
      return;
    }

    let active = true;
    const image = new window.Image();
    image.decoding = 'async';
    image.crossOrigin = 'anonymous';

    setState({ status: 'loading', image: null });
    callbackRef.current?.('loading');

    image.onload = () => {
      if (!active) return;
      setState({ status: 'ready', image });
      callbackRef.current?.('ready');
    };
    image.onerror = () => {
      if (!active) return;
      setState({ status: 'error', image: null });
      callbackRef.current?.('error');
    };
    image.src = url;

    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [url]);

  return state;
}
