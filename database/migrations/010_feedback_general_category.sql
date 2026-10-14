ALTER TABLE public_feedback DROP CONSTRAINT public_feedback_category_check;
ALTER TABLE public_feedback ADD CONSTRAINT public_feedback_category_check CHECK(category IN ('general','app_problem','suggestion','application_comment','provider_problem'));
CREATE INDEX public_feedback_filters ON public_feedback(status,category,created_at DESC,id DESC);
