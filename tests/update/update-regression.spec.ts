import { ROLES } from '../../src/roles/roles';
import { registerSessionSuite } from '../../src/suites/session.suite';
import { registerSearchSuite } from '../../src/suites/search.suite';
import { registerEducatorRecordSuite } from '../../src/suites/educatorRecord.suite';
import { registerDataIntegritySuite } from '../../src/suites/dataIntegrity.suite';
import { registerAccessibilitySuite } from '../../src/suites/accessibility.suite';
import { registerPermissionsSuite } from '../../src/suites/permissions.suite';

/**
 * Update user - full regression.
 *
 * Everything the Admin run covers except the Admin area itself. The permissions suite
 * supplies the negative cases in its place: /admin must be refused on a direct URL and
 * must not appear in the profile menu.
 */

const role = ROLES.update;

registerSessionSuite(role);
registerSearchSuite(role);
registerEducatorRecordSuite(role);
registerDataIntegritySuite(role);
registerAccessibilitySuite(role);
registerPermissionsSuite(role);
