-- Facebook joined the publishing set. Existing rows carry the old three-platform
-- array, so they'd never offer Facebook even once the owner links a Page.
--
-- Safe to widen for everyone: the worker intersects this column with the
-- accounts actually linked at upload-post, so a platform listed here but not
-- connected is simply skipped.
alter table customers alter column platforms set default '{instagram,tiktok,youtube,facebook}';

update customers
set platforms = array_append(platforms, 'facebook')
where not ('facebook' = any (platforms));
