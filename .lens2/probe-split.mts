import { splitFramedRequest } from '../src/main/agent-access/socket';
const r = splitFramedRequest(Buffer.from('{"a":1}\n TRAIL\n', 'utf8'));
console.log(JSON.stringify(r));
