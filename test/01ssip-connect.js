const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const Client = require('../src/ssip.js');

chai.use(chaiAsPromised);

describe('Connect and disconnect withi speech-dispatcher', function () {
  const sdSocket = '/run/user/1000/speech-dispatcher/speechd.sock';
  const ssip = new Client();
  it('Connect successfully', function () {
    const p1 = ssip.connect(sdSocket);
    expect(p1).to.be.a('promise');
    return expect(p1).to.be.fulfilled;
  });

  it('Disconnect from connected server', function () {
    const p2 = ssip.end();
    expect(p2).to.be.a('promise');
    return expect(p2).to.be.fulfilled;
  });

  it('Fail connect with bad socket path', function () {
    const p1 = ssip.connect('/bad/path/bad.sock');
    expect(p1).to.be.a('promise');
    return expect(p1).to.be.rejected;
  });
});
