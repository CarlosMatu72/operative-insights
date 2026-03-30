import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// Legacy route — redirects to Glosa panel
const ReviewDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    navigate("/glosa", { replace: true });
  }, [navigate]);

  return null;
};

export default ReviewDetail;
