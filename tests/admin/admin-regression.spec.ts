
import { ROLES } from '../../src/roles/roles';
import { registerSessionSuite } from '../../src/suites/session.suite';
import { registerSearchSuite } from '../../src/suites/search.suite';
import { registerEducatorRecordSuite } from '../../src/suites/educatorRecord.suite';
import { registerDataIntegritySuite } from '../../src/suites/dataIntegrity.suite';
import { registerAccessibilitySuite } from '../../src/suites/accessibility.suite';
import { registerAdminModulesSuite } from '../../src/suites/adminModules.suite';
import { registerPermissionsSuite } from '../../src/suites/permissions.suite';
import { registerSsnMaskingSuite } from '../../src/suites/ssnMasking.suite';

/**
 * Admin (Credential Online user) - full regression.
 *
 * The widest of the three runs: everything the other two roles do, plus the Admin area.
 * Test bodies live in src/suites; this file only decides which of them apply.
 */

const role = ROLES.admin;

registerSessionSuite(role);
registerSearchSuite(role);
registerEducatorRecordSuite(role);
registerDataIntegritySuite(role);
registerAccessibilitySuite(role);
registerAdminModulesSuite(role);
registerPermissionsSuite(role);
registerSsnMaskingSuite(role);
