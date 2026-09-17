-- PostgreSQL reference schema for PostHarvest.
--
-- Generated from the SQLAlchemy ORM (backend/core/database.py Base.metadata)
-- regenerate with `python scripts/generate_schema_sql.py`.
-- The ORM is the source of truth; this file is for review / Supabase console
-- provisioning and must be re-generated when models change.


CREATE TABLE users (
	id SERIAL NOT NULL, 
	firebase_uid VARCHAR(128) NOT NULL, 
	email VARCHAR(255), 
	display_name VARCHAR(255), 
	photo_url TEXT, 
	plan VARCHAR(32) NOT NULL, 
	role VARCHAR(32) NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
)

;
CREATE UNIQUE INDEX ix_users_firebase_uid ON users (firebase_uid);


CREATE TABLE saved_accounts (
	id SERIAL NOT NULL, 
	owner_id INTEGER, 
	scope VARCHAR(16) NOT NULL, 
	name VARCHAR(128) NOT NULL, 
	cookies TEXT NOT NULL, 
	credentials TEXT, 
	meta JSON, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(owner_id) REFERENCES users (id) ON DELETE CASCADE
)

;
CREATE INDEX ix_saved_accounts_owner_id ON saved_accounts (owner_id);


CREATE TABLE scrape_jobs (
	id VARCHAR(32) NOT NULL, 
	owner_id INTEGER, 
	status VARCHAR(16) NOT NULL, 
	pages_total INTEGER NOT NULL, 
	pages_completed INTEGER NOT NULL, 
	posts_found INTEGER NOT NULL, 
	posts_processed INTEGER NOT NULL, 
	posts_skipped INTEGER NOT NULL, 
	posts_failed INTEGER NOT NULL, 
	duplicates INTEGER NOT NULL, 
	storage_duplicates INTEGER NOT NULL, 
	errors_count INTEGER NOT NULL, 
	options JSON, 
	cancel_requested BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	started_at TIMESTAMP WITH TIME ZONE, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(owner_id) REFERENCES users (id) ON DELETE CASCADE
)

;
CREATE INDEX ix_scrape_jobs_owner_id ON scrape_jobs (owner_id);
CREATE INDEX ix_scrape_jobs_status ON scrape_jobs (status);


CREATE TABLE export_jobs (
	id SERIAL NOT NULL, 
	job_id VARCHAR(32) NOT NULL, 
	format VARCHAR(16) NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	file_path VARCHAR(1024), 
	error_code VARCHAR(64), 
	error_message TEXT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(job_id) REFERENCES scrape_jobs (id) ON DELETE CASCADE
)

;
CREATE INDEX ix_export_jobs_job_id ON export_jobs (job_id);


CREATE TABLE sources (
	id SERIAL NOT NULL, 
	job_id VARCHAR(32) NOT NULL, 
	url VARCHAR(2048) NOT NULL, 
	normalized_url VARCHAR(2048) NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	page_name VARCHAR(512), 
	page_id VARCHAR(128), 
	posts_discovered INTEGER NOT NULL, 
	posts_extracted INTEGER NOT NULL, 
	duplicates_removed INTEGER NOT NULL, 
	posts_skipped INTEGER NOT NULL, 
	posts_failed INTEGER NOT NULL, 
	error_code VARCHAR(64), 
	error_message TEXT, 
	started_at TIMESTAMP WITH TIME ZONE, 
	finished_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_sources_job_url UNIQUE (job_id, normalized_url), 
	FOREIGN KEY(job_id) REFERENCES scrape_jobs (id) ON DELETE CASCADE
)

;
CREATE INDEX ix_sources_job_id ON sources (job_id);
CREATE INDEX ix_sources_status ON sources (status);


CREATE TABLE crawl_states (
	id SERIAL NOT NULL, 
	source_id INTEGER NOT NULL, 
	job_id VARCHAR(32) NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	cursor TEXT, 
	pages_fetched INTEGER NOT NULL, 
	posts_extracted INTEGER NOT NULL, 
	posts_stored INTEGER NOT NULL, 
	meta JSON, 
	consecutive_errors INTEGER NOT NULL, 
	last_error_code VARCHAR(64), 
	last_error_message TEXT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(source_id) REFERENCES sources (id) ON DELETE CASCADE, 
	FOREIGN KEY(job_id) REFERENCES scrape_jobs (id) ON DELETE CASCADE
)

;
CREATE INDEX ix_crawl_states_job_id ON crawl_states (job_id);
CREATE INDEX ix_crawl_states_source_id ON crawl_states (source_id);
CREATE INDEX ix_crawl_states_status ON crawl_states (status);


CREATE TABLE errors (
	id SERIAL NOT NULL, 
	job_id VARCHAR(32) NOT NULL, 
	source_id INTEGER, 
	source_url VARCHAR(2048) NOT NULL, 
	post_url VARCHAR(2048), 
	code VARCHAR(64) NOT NULL, 
	message TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(job_id) REFERENCES scrape_jobs (id) ON DELETE CASCADE, 
	FOREIGN KEY(source_id) REFERENCES sources (id) ON DELETE CASCADE
)

;
CREATE INDEX ix_errors_job_id ON errors (job_id);
CREATE INDEX ix_errors_source_id ON errors (source_id);


CREATE TABLE posts (
	id SERIAL NOT NULL, 
	job_id VARCHAR(32) NOT NULL, 
	source_id INTEGER NOT NULL, 
	post_id VARCHAR(128), 
	dedup_key VARCHAR(192) NOT NULL, 
	facebook_url VARCHAR(2048), 
	post_url VARCHAR(2048), 
	page_name VARCHAR(512), 
	page_id VARCHAR(128), 
	profile_url VARCHAR(2048), 
	post_type VARCHAR(16), 
	published_at TIMESTAMP WITH TIME ZONE, 
	timestamp BIGINT, 
	text TEXT, 
	caption TEXT, 
	hashtags JSON, 
	mentions JSON, 
	external_links JSON, 
	media_type VARCHAR(32), 
	thumbnail_url VARCHAR(2048), 
	media_url VARCHAR(2048), 
	video_url VARCHAR(2048), 
	transcript TEXT, 
	transcript_language VARCHAR(16), 
	scraped_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_posts_source_dedup_key UNIQUE (source_id, dedup_key), 
	FOREIGN KEY(job_id) REFERENCES scrape_jobs (id) ON DELETE CASCADE, 
	FOREIGN KEY(source_id) REFERENCES sources (id) ON DELETE CASCADE
)

;
CREATE INDEX ix_posts_job_id ON posts (job_id);
CREATE INDEX ix_posts_job_published ON posts (job_id, published_at);
CREATE INDEX ix_posts_page_id ON posts (page_id);
CREATE INDEX ix_posts_post_id ON posts (post_id);
CREATE INDEX ix_posts_published_at ON posts (published_at);
CREATE INDEX ix_posts_source_id ON posts (source_id);


CREATE TABLE engagement_metrics (
	id SERIAL NOT NULL, 
	post_id INTEGER NOT NULL, 
	likes INTEGER, 
	reactions INTEGER, 
	comments_count INTEGER, 
	shares INTEGER, 
	views_count INTEGER, 
	reaction_like_count INTEGER, 
	reaction_love_count INTEGER, 
	reaction_care_count INTEGER, 
	reaction_haha_count INTEGER, 
	reaction_wow_count INTEGER, 
	reaction_sad_count INTEGER, 
	reaction_angry_count INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(post_id) REFERENCES posts (id) ON DELETE CASCADE
)

;
CREATE UNIQUE INDEX ix_engagement_metrics_post_id ON engagement_metrics (post_id);


CREATE TABLE media (
	id SERIAL NOT NULL, 
	post_id INTEGER NOT NULL, 
	media_type VARCHAR(32), 
	url VARCHAR(2048), 
	thumbnail_url VARCHAR(2048), 
	video_url VARCHAR(2048), 
	PRIMARY KEY (id), 
	FOREIGN KEY(post_id) REFERENCES posts (id) ON DELETE CASCADE
)

;
CREATE INDEX ix_media_post_id ON media (post_id);
