/**
 * A YouTube video that stays a still frame until someone asks for it: our own optimised thumbnail
 * and play button, and only on click the player itself, from youtube-nocookie.com through YouTube's
 * IFrame Player API (so the page can follow playback, which drives the movie-night projector).
 *
 * The link is the fallback: without JavaScript, or if the player can't load, it opens the video on
 * YouTube. Techniques after paulirish/lite-youtube-embed: warm the connections on hover or focus,
 * start playback as soon as the player is ready, and move focus to it.
 */

/** The parts of the IFrame Player API used here (https://developers.google.com/youtube/iframe_api_reference). */
interface YTPlayer {
  playVideo(): void;
  destroy(): void;
  getIframe(): HTMLIFrameElement;
}

interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

interface YTPlayerOptions {
  host: string;
  videoId: string;
  width: string;
  height: string;
  playerVars: Record<string, string | number>;
  events: {
    onReady: (event: YTPlayerEvent) => void;
    onStateChange: (event: YTPlayerEvent) => void;
  };
}

interface YTNamespace {
  Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** What the screen is doing, for anything that wants to follow along. */
export type ScreenState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended';

/** YouTube's player states: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued. */
export function screenStateFor(playerState: number): ScreenState {
  switch (playerState) {
    case 0:
      return 'ended';
    case 1:
      return 'playing';
    case 2:
      return 'paused';
    default:
      return 'loading';
  }
}

const PLAYER_API = 'https://www.youtube.com/iframe_api';
const PLAYER_HOST = 'https://www.youtube-nocookie.com';
/** The origins a play is about to need, warmed on hover or focus. */
const ORIGINS = [
  PLAYER_HOST,
  'https://www.youtube.com',
  'https://www.google.com',
  'https://i.ytimg.com',
];

let apiPromise: Promise<YTNamespace> | undefined;

function loadPlayerApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = PLAYER_API;
    script.async = true;
    script.onerror = () => {
      apiPromise = undefined;
      reject(new Error('The YouTube player API failed to load'));
    };
    document.head.append(script);
  });
  return apiPromise;
}

let warmed = false;

function warmConnections(): void {
  if (warmed) return;
  warmed = true;
  for (const href of ORIGINS) {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    document.head.append(link);
  }
}

/**
 * Turn `root`'s `[data-youtube-id]` link into a player on click. `onState` hears every change.
 * Modified clicks (new tab, new window) still follow the link to YouTube.
 */
export function initYouTubeScreen(
  root: HTMLElement,
  onState: (state: ScreenState) => void,
  signal: AbortSignal,
): void {
  const link = root.querySelector<HTMLAnchorElement>('a[data-youtube-id]');
  const videoId = link?.dataset.youtubeId;
  if (!link || !videoId) return;

  link.addEventListener('pointerover', warmConnections, { once: true, signal });
  link.addEventListener('focusin', warmConnections, { once: true, signal });

  let player: YTPlayer | undefined;

  const title = link.dataset.youtubeTitle ?? 'YouTube video';
  /** YouTube's script sets its own generic title on the player; keep ours, which names the video. */
  const nameFrame = (target: YTPlayer) => {
    const iframe = target.getIframe();
    if (iframe.title !== title) iframe.title = title;
    return iframe;
  };

  const play = async () => {
    warmConnections();
    onState('loading');
    link.setAttribute('aria-busy', 'true');
    try {
      const YT = await loadPlayerApi();
      if (signal.aborted) return;
      const slot = document.createElement('div');
      root.append(slot);
      player = new YT.Player(slot, {
        host: PLAYER_HOST,
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, origin: location.origin },
        events: {
          onReady: event => {
            const iframe = nameFrame(event.target);
            // The still frame steps aside once the player can take over.
            link.hidden = true;
            iframe.focus();
            event.target.playVideo();
          },
          onStateChange: event => {
            nameFrame(event.target);
            onState(screenStateFor(event.data));
          },
        },
      });
    } catch {
      // No player: fall back to watching on YouTube.
      onState('idle');
      link.removeAttribute('aria-busy');
      window.open(link.href, '_blank', 'noopener');
    }
  };

  link.addEventListener(
    'click',
    event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      if (player || link.getAttribute('aria-busy')) return;
      void play();
    },
    { signal },
  );

  signal.addEventListener('abort', () => player?.destroy(), { once: true });
}
