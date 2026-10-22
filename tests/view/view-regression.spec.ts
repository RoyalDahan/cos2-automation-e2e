import { ROLES } from '../../src/roles/roles';
import { registerSessionSuite } from '../../src/suites/session.suite';
import { registerSearchSuite } from '../../src/suites/search.suite';
import { registerEducatorRecordSuite } from '../../src/suites/educatorRecord.suite';
import { registerDataIntegritySuite } from '../../src/suites/dataIntegrity.suite';
import { registerAccessibilitySuite } from '../../src/suites/accessibility.suite';
import { registerPermissionsSuite } from '../../src/suites/permissions.suite';
import { registerSsnMaskingSuite } from '../../src/suites/ssnMasking.suite';

/**
 * View-only user - full regression.
 *
 * The narrowest run by rights but not by test count: everything readable is still
 * verified, and the permissions suite adds the negative cases for both things this role
 * must not do - reach the Admin area, and reach any editor.
 */

const role = ROLES.view;

registerSessionSuite(role);
registerSearchSuite(role);
registerEducatorRecordSuite(role);
registerDataIntegritySuite(role);
registerAccessibilitySuite(role);
registerPermissionsSuite(role);
registerSsnMaskingSuite(role);
