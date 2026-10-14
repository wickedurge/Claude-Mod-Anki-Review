import { expect, test } from 'claude-code/testing'

import { htmlToText } from './text'

// Issue #4: how card HTML becomes text in the pane.

test('#4: plain text is unchanged', () => {
  expect(htmlToText('el desarrollo')).toBe('el desarrollo')
})

test('#4: an empty side stays empty', () => {
  expect(htmlToText('')).toBe('')
})

test('#4: tags are removed and the text inside them kept', () => {
  expect(htmlToText('<b>tener</b> <i>(yo)</i>')).toBe('tener (yo)')
})

test('#4: line-starting tags become line breaks, with no blank lines', () => {
  expect(htmlToText('one<br>two<div>three</div><div>four</div>')).toBe('one\ntwo\nthree\nfour')
})

test('#4: bad HTML still leaves its text', () => {
  expect(htmlToText('<div><b>tener<i> (yo)</b></div><span style="color:red">&amp; ir')).toBe(
    'tener (yo)\n& ir',
  )
  expect(htmlToText('cut off <b')).toBe('cut off')
})

test('#4: images and sounds become markers', () => {
  expect(htmlToText('<img src="cat.jpg">')).toBe('[image]')
  expect(htmlToText('A cat [sound:gato.mp3]')).toBe('A cat [sound]')
})

test('#4: common entities are decoded', () => {
  expect(htmlToText('&lt;irregular&gt; &quot;a&quot;&nbsp;b')).toBe('<irregular> "a" b')
})
