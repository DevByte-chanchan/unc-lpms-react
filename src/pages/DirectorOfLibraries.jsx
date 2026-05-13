import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ApprovalCoursesTable from "../components/ApprovalCoursesTable.jsx";
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const DirectorOfLibraries = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const page = searchParams.get('page');
    if (!page || page === 'Syllabus') {
      navigate('/role/director-of-libraries', { replace: true });
      return;
    }
  }, [searchParams, navigate]);

  return (
      <Skeleton
          header={<Header role="Director Of Libraries" name="NORTON, MONICA" />}
          nav={<SideNavigation mode="director-of-libraries" />}
          content={<ApprovalCoursesTable role="director-of-libraries" />}
      />
  );
};

export default DirectorOfLibraries;
