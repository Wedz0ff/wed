import { describe, expect, it } from 'vitest';
import { mapKeyToAction } from '../../src/app/commands';
import type { KeyLike } from '../../src/app/commands';

const none: KeyLike = {
  upArrow: false,
  downArrow: false,
  pageUp: false,
  pageDown: false,
  return: false,
  escape: false,
  ctrl: false,
  shift: false,
  backspace: false,
  delete: false,
  home: false,
  end: false,
};

function key(partial: Partial<KeyLike> = {}): KeyLike {
  return { ...none, ...partial };
}

describe('mapKeyToAction', () => {
  it('maps normal-mode commands', () => {
    expect(mapKeyToAction('q', key(), 'normal')).toEqual({ type: 'quit' });
    expect(mapKeyToAction('c', key({ ctrl: true }), 'normal')).toEqual({
      type: 'ctrlC',
    });
    expect(mapKeyToAction('p', key(), 'normal')).toEqual({
      type: 'toggleFollow',
    });
    expect(mapKeyToAction('c', key(), 'normal')).toEqual({ type: 'copy' });
    expect(mapKeyToAction('x', key(), 'normal')).toEqual({ type: 'clear' });
    expect(mapKeyToAction('f', key(), 'normal')).toEqual({
      type: 'openFilter',
    });
    expect(mapKeyToAction('/', key(), 'normal')).toEqual({
      type: 'openSearch',
    });
    expect(mapKeyToAction('r', key(), 'normal')).toEqual({ type: 'restart' });
    expect(mapKeyToAction('!', key(), 'normal')).toEqual({
      type: 'openCommand',
    });
    expect(mapKeyToAction('s', key(), 'normal')).toBeNull();
    expect(mapKeyToAction('', key({ return: true }), 'normal')).toEqual({
      type: 'inspect',
    });
    expect(mapKeyToAction('1', key(), 'normal')).toEqual({
      type: 'setLevel',
      level: 'all',
    });
    expect(mapKeyToAction('5', key(), 'normal')).toEqual({
      type: 'setLevel',
      level: 'error',
    });
  });

  it('maps scrolling keys', () => {
    expect(mapKeyToAction('', key({ upArrow: true }), 'normal')).toEqual({
      type: 'scroll',
      delta: -1,
    });
    expect(mapKeyToAction('', key({ pageDown: true }), 'normal')).toEqual({
      type: 'page',
      direction: 1,
    });
    expect(mapKeyToAction('', key({ home: true }), 'normal')).toEqual({
      type: 'home',
    });
    expect(mapKeyToAction('', key({ end: true }), 'normal')).toEqual({
      type: 'end',
    });
  });

  it('routes typing to the query in filter and search modes', () => {
    expect(mapKeyToAction('a', key(), 'filter')).toEqual({
      type: 'input',
      text: 'a',
    });
    expect(mapKeyToAction('', key({ backspace: true }), 'search')).toEqual({
      type: 'backspace',
    });
    expect(mapKeyToAction('', key({ escape: true }), 'search')).toEqual({
      type: 'escape',
    });
    expect(mapKeyToAction('n', key(), 'search')).toEqual({
      type: 'searchNext',
    });
    expect(mapKeyToAction('N', key({ shift: true }), 'search')).toEqual({
      type: 'searchPrev',
    });
  });

  it('maps command-mode keys', () => {
    expect(mapKeyToAction('s', key(), 'command')).toEqual({
      type: 'input',
      text: 's',
    });
    expect(mapKeyToAction('', key({ backspace: true }), 'command')).toEqual({
      type: 'backspace',
    });
    expect(mapKeyToAction('', key({ return: true }), 'command')).toEqual({
      type: 'submitCommand',
    });
    expect(mapKeyToAction('', key({ escape: true }), 'command')).toEqual({
      type: 'escape',
    });
  });

  it('maps settings-mode keys', () => {
    expect(mapKeyToAction('', key({ upArrow: true }), 'settings')).toEqual({
      type: 'scroll',
      delta: -1,
    });
    expect(mapKeyToAction('', key({ downArrow: true }), 'settings')).toEqual({
      type: 'scroll',
      delta: 1,
    });
    expect(mapKeyToAction('', key({ return: true }), 'settings')).toEqual({
      type: 'confirmSettings',
    });
    expect(mapKeyToAction('', key({ escape: true }), 'settings')).toEqual({
      type: 'escape',
    });
    expect(mapKeyToAction('q', key(), 'settings')).toEqual({ type: 'quit' });
    expect(mapKeyToAction('f', key(), 'settings')).toBeNull();
  });
});
