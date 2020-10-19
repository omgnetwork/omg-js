import { assert, should, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

should();
use(chaiAsPromised);

describe('utiltest', function () {
  it('should pass', function () {
    assert.isTrue(true);
  });
});
