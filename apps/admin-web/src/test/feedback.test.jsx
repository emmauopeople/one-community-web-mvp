import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const {get,post,patch}=vi.hoisted(()=>({get:vi.fn(),post:vi.fn(),patch:vi.fn()}));
vi.mock('axios',()=>({default:{create:()=>({get,post,patch})}}));
vi.mock('../components/layout/DashboardLayout',()=>({default:({children})=><div>{children}</div>}));
vi.mock('../i18n/index.js',()=>({t:s=>s,useLocale:()=> 'en'}));
import FeedbackPage from '../pages/feedback/FeedbackPage';
afterEach(()=>{cleanup();vi.clearAllMocks();});
const item={id:1,kind:'report',category:'app_problem',subject:'A problem',description:'A detailed report.',created_at:'2026-10-06T12:00:00Z',channel:'web',language:'en',location_status:'denied',contact_consent:false,status:'new',useful:null};
it('shows anonymous feedback without a reply form and labels voluntary survey totals',async()=>{
 get.mockResolvedValue({data:{items:[item],summary:[{kind:'survey',useful:true,count:2}],hasMore:false}});
 render(<FeedbackPage/>);
 await screen.findByText('A problem');
 expect(screen.queryByRole('button',{name:'Send reply'})).toBeNull();
 expect(screen.getByText('No contact consent')).toBeTruthy();
 expect(screen.getByText('Location declined')).toBeTruthy();
 expect(screen.getByText(/not unique people/)).toBeTruthy();
});
it('consenting reply explicitly reports Mailpit rather than external delivery',async()=>{
 get.mockImplementation(url=>Promise.resolve({data:url.endsWith('replies')?{replies:[]}:{items:[{...item,email:'fixture@example.test',contact_consent:true}],summary:[],hasMore:false}}));
 post.mockResolvedValue({data:{ok:true,localOnly:true}});
 render(<FeedbackPage/>);
 fireEvent.change(await screen.findByLabelText('Email reply'),{target:{value:'Thanks for reporting this.'}});
 fireEvent.click(screen.getByRole('button',{name:'Send reply'}));
 await screen.findByText('Reply saved in local Mailpit. No external email was sent.');
 await waitFor(()=>expect(post).toHaveBeenCalledTimes(1));
 expect(post.mock.calls[0][1].requestId).toMatch(/^[0-9a-f-]{36}$/);
});
