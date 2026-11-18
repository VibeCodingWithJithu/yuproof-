// YuProof schema (milestone 2 subset of YUPROOF_SPEC.md section 6). Idempotent; run on first connection.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS issuers (
  id             text PRIMARY KEY,
  name           text NOT NULL,
  type           text NOT NULL,
  aishe_code     text,
  email_domain   text,
  contact_email  text,
  location       text,
  wallet_address text UNIQUE,
  status         text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied','approved','suspended','rejected')),
  approved_at    timestamptz,
  is_sample      boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batches (
  id             text PRIMARY KEY,
  issuer_id      text NOT NULL REFERENCES issuers(id),
  template_id    text,
  doc_type       text NOT NULL,
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','checked','signed','recording','recorded','failed')),
  count          integer NOT NULL DEFAULT 0,
  merkle_root    text,
  chain_batch_id bigint,
  tx_hash        text,
  block          bigint,
  signed_by      text,
  recorded_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id             text PRIMARY KEY,
  batch_id       text REFERENCES batches(id),
  issuer_id      text NOT NULL REFERENCES issuers(id),
  doc_type       text NOT NULL,
  title          text NOT NULL,
  holder_name    text NOT NULL,
  roll_no        text,
  phone          text,
  email          text,
  data           jsonb NOT NULL DEFAULT '{}',
  pdf_url        text,
  hash           text NOT NULL UNIQUE,
  merkle_proof   jsonb,
  tx_hash        text,
  status         text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','cancelled')),
  cancel_reason  text,
  cancelled_at   timestamptz,
  replacement_id text REFERENCES documents(id),
  issued_at      timestamptz NOT NULL DEFAULT now(),
  is_sample      boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS documents_issuer_idx ON documents(issuer_id);
CREATE INDEX IF NOT EXISTS documents_batch_idx ON documents(batch_id);

CREATE TABLE IF NOT EXISTS share_links (
  code           text PRIMARY KEY,
  document_id    text NOT NULL REFERENCES documents(id),
  holder_id      text,
  recipient      text,
  expires_at     timestamptz,
  show_marks     boolean NOT NULL DEFAULT false,
  allow_download boolean NOT NULL DEFAULT false,
  opens          integer NOT NULL DEFAULT 0,
  revoked_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checks (
  id              bigserial PRIMARY KEY,
  document_id     text REFERENCES documents(id),
  method          text NOT NULL CHECK (method IN ('qr','id','upload','link','api','bulk')),
  result          text NOT NULL CHECK (result IN ('genuine','tampered','cancelled','not_found')),
  verifier_org_id text,
  hr_batch_id     text,
  ip_country      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checks_document_idx ON checks(document_id);

CREATE TABLE IF NOT EXISTS watchlist (
  id         bigserial PRIMARY KEY,
  name       text NOT NULL,
  location   text,
  source     text NOT NULL,
  evidence   text,
  status     text NOT NULL DEFAULT 'review' CHECK (status IN ('review','blocked','cleared')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id             bigserial PRIMARY KEY,
  document_id    text REFERENCES documents(id),
  claimed_doc_id text,
  hash           text,
  reason         text NOT NULL,
  contact        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
`;
