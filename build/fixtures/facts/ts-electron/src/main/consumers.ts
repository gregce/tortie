import { on } from './events';
import { sock } from './net';

on('push:ready', () => undefined);
sock.on('data', () => undefined);
$(window).on('hashchange', openCurrentItemIfClosed);
this.$input.on("input.tt", onInput);
