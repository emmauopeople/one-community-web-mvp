import test from 'node:test';
import assert from 'node:assert/strict';
import {replyEmailContent} from '../apps/admin-api/src/services/replyEmail.js';
test('reply email retains plain text, links to ServiceCam and escapes HTML in user content', () => {
  const content = replyEmailContent('<script>alert("x")</script> & hello\nNext line');
  assert.match(content.text, /This message is from One Community\. Do not reply to this email\./);
  assert.match(content.text, /Contact us: https:\/\/servicecam\.org/);
  assert.match(content.html, /<a href="https:\/\/servicecam\.org">Contact us<\/a>/);
  assert.doesNotMatch(content.html, /<script>/);
  assert.match(content.html, /&lt;script&gt;/);
  assert.match(replyEmailContent('Bonjour', 'fr').html, /Contactez-nous/);
});
