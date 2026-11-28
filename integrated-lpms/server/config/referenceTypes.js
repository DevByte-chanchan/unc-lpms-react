'use strict';

/**
 * Unified 4-Type Academic Reference Normalizer
 * Supports all 4 required types across Composition (M2) and Library Repository (M3):
 *   1. Textbook
 *   2. Open Educational Resources (alias: OER)
 *   3. Online Resources (alias: Online Resource)
 *   4. Online Subscriptions (alias: Online Subscription)
 */

const CANONICAL_REFERENCE_TYPES = Object.freeze([
  'Textbook',
  'Open Educational Resources',
  'Online Resources',
  'Online Subscriptions',
]);

const SHORT_TO_CANONICAL = Object.freeze({
  textbook: 'Textbook',
  textbooks: 'Textbook',
  book: 'Textbook',
  oer: 'Open Educational Resources',
  'open educational resource': 'Open Educational Resources',
  'open educational resources': 'Open Educational Resources',
  'online resource': 'Online Resources',
  'online resources': 'Online Resources',
  online: 'Online Resources',
  'online subscription': 'Online Subscriptions',
  'online subscriptions': 'Online Subscriptions',
  subscription: 'Online Subscriptions',
  subscriptions: 'Online Subscriptions',
});

const CANONICAL_TO_SHORT = Object.freeze({
  Textbook: 'Textbook',
  'Open Educational Resources': 'OER',
  'Online Resources': 'Online Resource',
  'Online Subscriptions': 'Online Subscription',
});

function normalizeReferenceType(raw) {
  if (!raw) return 'Textbook';
  const key = String(raw).trim().toLowerCase();
  return SHORT_TO_CANONICAL[key] || String(raw).trim();
}

function toShortReferenceType(raw) {
  const canonical = normalizeReferenceType(raw);
  return CANONICAL_TO_SHORT[canonical] || canonical;
}

function isTextbookType(raw) {
  return normalizeReferenceType(raw) === 'Textbook';
}

module.exports = {
  CANONICAL_REFERENCE_TYPES,
  normalizeReferenceType,
  toShortReferenceType,
  isTextbookType,
};
