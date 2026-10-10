/**
 * Set password — /set-password?token=… (public). The invitation link: "Welcome,
 * {name}", their email and roles, and a new password. See PasswordLinkPage.
 */
import PasswordLinkPage from './PasswordLinkPage.jsx';

const SetPassword = () => <PasswordLinkPage mode="invite" />;

export default SetPassword;
