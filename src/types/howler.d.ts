declare module 'howler' {
  export interface HowlOptions {
    src: string | string[];
    volume?: number;
    html5?: boolean;
    loop?: boolean;
    preload?: boolean | 'metadata';
    autoplay?: boolean;
    mute?: boolean;
    sprite?: { [key: string]: [number, number] };
    rate?: number;
    pool?: number;
    format?: string | string[];
    onload?: () => void;
    onloaderror?: (id: number, error: any) => void;
    onplay?: (id: number) => void;
    onplayerror?: (id: number, error: any) => void;
    onend?: (id: number) => void;
    onpause?: (id: number) => void;
    onstop?: (id: number) => void;
    onmute?: (id: number) => void;
    onvolume?: (id: number) => void;
    onrate?: (id: number) => void;
    onseek?: (id: number) => void;
    onfade?: (id: number) => void;
  }

  export class Howl {
    constructor(options: HowlOptions);

    play(spriteOrId?: string | number): number;
    pause(id?: number): this;
    stop(id?: number): this;
    mute(muted?: boolean, id?: number): this;
    volume(volume?: number, id?: number): number;
    fade(from: number, to: number, duration: number, id?: number): this;
    rate(rate?: number, id?: number): number;
    seek(seek?: number, id?: number): number;
    loop(loop?: boolean, id?: number): this;
    playing(id?: number): boolean;
    duration(id?: number): number;
    state(): 'unloaded' | 'loading' | 'loaded';
    load(): this;
    unload(): this;

    // Events
    on(event: 'load', handler: () => void, id?: number): this;
    on(event: 'loaderror', handler: (id: number, error: any) => void, id?: number): this;
    on(event: 'play', handler: (id: number) => void, id?: number): this;
    on(event: 'playerror', handler: (id: number, error: any) => void, id?: number): this;
    on(event: 'end', handler: (id: number) => void, id?: number): this;
    on(event: 'pause', handler: (id: number) => void, id?: number): this;
    on(event: 'stop', handler: (id: number) => void, id?: number): this;
    on(event: 'mute', handler: (id: number) => void, id?: number): this;
    on(event: 'volume', handler: (id: number) => void, id?: number): this;
    on(event: 'rate', handler: (id: number) => void, id?: number): this;
    on(event: 'seek', handler: (id: number) => void, id?: number): this;
    on(event: 'fade', handler: (id: number) => void, id?: number): this;
    on(event: 'unlock', handler: () => void, id?: number): this;

    off(event?: string, handler?: Function, id?: number): this;
    once(event: string, handler: Function, id?: number): this;
  }

  // Global methods
  export function mute(muted: boolean): void;
  export function volume(volume: number): number;
  export function stop(id?: number): void;
  export function unload(): void;
  export function codecs(ext: string): boolean;

  // Global properties
  export const ctx: AudioContext | null;
  export const masterGain: GainNode | null;
  export const usingWebAudio: boolean;
  export const autoUnlock: boolean;
  export const html5PoolSize: number;
  export const autoSuspend: boolean;
  export const noAudio: boolean;
}
