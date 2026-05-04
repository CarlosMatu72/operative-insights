UPDATE public.review_cases
SET deleted_at = now(),
    delete_reason = 'Eliminado por solicitud del usuario',
    is_active_remesa = false,
    updated_at = now()
WHERE id = '0c412a68-b426-4a01-8dce-0be11d1c7f88';