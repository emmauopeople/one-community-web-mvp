import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
vi.mock('../i18n/index.js',()=>({t:s=>s,te:s=>s,useLocale:()=> 'en'}));
import CreateAdminPanel from '../components/system/CreateAdminPanel';
afterEach(cleanup);
it('defaults to Admin and submits the Root choice with a normalized email',()=>{
 const create=vi.fn();render(<CreateAdminPanel isOpen onCreate={create}/>);
 expect(screen.getByLabelText('Role').value).toBe('admin');
 for(const [name,value] of [['Full Name',' New Root '],['Email','ROOT@example.test'],['Password','Password123!'],['Confirm Password','Password123!'],['Role','root_admin']])fireEvent.change(screen.getByLabelText(name),{target:{value}});
 fireEvent.click(screen.getByRole('button',{name:'Create Admin'}));
 expect(create).toHaveBeenCalledWith({full_name:'New Root',email:'root@example.test',password:'Password123!',role:'root_admin'});
});
it('shows server errors in the open form and prevents duplicate submit while busy',()=>{
 const create=vi.fn();render(<CreateAdminPanel isOpen isCreating onCreate={create} error="An admin with this email already exists"/>);
 expect(screen.getByRole('alert').textContent).toContain('already exists');
 expect(screen.getByRole('button',{name:'Creating...'}).disabled).toBe(true);
 expect(create).not.toHaveBeenCalled();
});
