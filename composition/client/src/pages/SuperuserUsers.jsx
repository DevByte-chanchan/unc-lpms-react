import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import { UserAccountsPanel } from './UserAccounts.jsx'

// The superuser's account administration: the User Accounts page (pages/UserAccounts.jsx), shared with the VPAA.
const SuperuserUsers = () => (
    <Skeleton
        header={<Header role="Superuser" />}
        nav={<SideNavigation mode="superuser" />}
        content={<UserAccountsPanel />}
    />
);

export default SuperuserUsers;
