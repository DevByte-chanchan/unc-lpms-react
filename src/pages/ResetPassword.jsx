/**
 * Reset password — /reset-password?token=… (public). The "forgot password"
 * link: choose a new password, then you're signed in. See PasswordLinkPage.
 */
import PasswordLinkPage from './PasswordLinkPage.jsx';

const ResetPassword = () => <PasswordLinkPage mode="reset" />;

export default ResetPassword;
