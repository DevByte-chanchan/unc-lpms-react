import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ApprovalCoursesTable from "../components/ApprovalCoursesTable.jsx";
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const IndustryConsultant = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const page = searchParams.get('page');
    if (!page || page === 'Syllabus') {
      navigate('/role/industry-consultant', { replace: true });
      return;
    }
  }, [searchParams, navigate]);

  return (
      <Skeleton
          header={<Header role="Industry Consultant" name="NORTON, MONICA" />}
          nav={<SideNavigation mode="industry-consultant" />}
          content={<ApprovalCoursesTable role="industry-consultant" />}
      />
  );
};

export default IndustryConsultant;
