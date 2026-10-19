import { TestBed } from '@angular/core/testing';

import { Admin } from './admin';
import { Supabase } from './supabase';

describe('Admin', () => {
  let service: Admin;
  let respuesta: { data: any; error: any };
  let insertSpy: jasmine.Spy;
  let updateSpy: jasmine.Spy;
  let eqSpy: jasmine.Spy;
  let fromSpy: jasmine.Spy;
  let uploadSpy: jasmine.Spy;
  let getPublicUrlSpy: jasmine.Spy;
  let storageFromSpy: jasmine.Spy;

  function crearBuilder(): any {
    const builder: any = {
      select: jasmine.createSpy('select').and.callFake(() => builder),
      insert: insertSpy.and.callFake(() => builder),
      update: updateSpy.and.callFake(() => builder),
      delete: jasmine.createSpy('delete').and.callFake(() => builder),
      eq: eqSpy.and.callFake(() => builder),
      single: jasmine.createSpy('single').and.callFake(() => Promise.resolve(respuesta)),
      then: (resolve: any, reject: any) => Promise.resolve(respuesta).then(resolve, reject),
    };
    return builder;
  }

  beforeEach(() => {
    respuesta = { data: {}, error: null };
    insertSpy = jasmine.createSpy('insert');
    updateSpy = jasmine.createSpy('update');
    eqSpy = jasmine.createSpy('eq');
    fromSpy = jasmine.createSpy('from').and.callFake(() => crearBuilder());

    uploadSpy = jasmine.createSpy('upload').and.resolveTo({ data: { path: 'img-1.jpg' }, error: null });
    getPublicUrlSpy = jasmine
      .createSpy('getPublicUrl')
      .and.returnValue({ data: { publicUrl: 'https://ejemplo.com/img-1.jpg' } });
    storageFromSpy = jasmine.createSpy('storageFrom').and.returnValue({
      upload: uploadSpy,
      getPublicUrl: getPublicUrlSpy,
      remove: jasmine.createSpy('remove').and.resolveTo({ data: null, error: null }),
    });

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Supabase,
          useValue: { client: { from: fromSpy, storage: { from: storageFromSpy } } },
        },
      ],
    });
    service = TestBed.inject(Admin);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('UT-ADM-01 crearLugar envía los campos del lugar', async () => {
    const datos = { nombre: 'Nuevo lugar', id_categoria: 'c1', id_comuna: 'm1' };
    respuesta = { data: { id_lugar: 'l1', ...datos }, error: null };

    const resultado = await service.crearLugar(datos);
    expect(insertSpy).toHaveBeenCalledWith(datos);
    expect(resultado).toEqual(respuesta.data);
  });

  it('UT-ADM-01b editarLugar filtra por id y envía los cambios', async () => {
    const cambios = { nombre: 'Nombre editado' };
    respuesta = { data: { id_lugar: 'l1', ...cambios }, error: null };

    await service.editarLugar('l1', cambios);
    expect(updateSpy).toHaveBeenCalledWith(cambios);
    expect(eqSpy).toHaveBeenCalledWith('id_lugar', 'l1');
  });

  it('UT-ADM-02 subirImagenLugar sube el archivo y devuelve la URL pública', async () => {
    const archivo = new File(['contenido'], 'foto.jpg', { type: 'image/jpeg' });
    const url = await service.subirImagenLugar(archivo);

    expect(uploadSpy).toHaveBeenCalled();
    expect(getPublicUrlSpy).toHaveBeenCalled();
    expect(url).toBe('https://ejemplo.com/img-1.jpg');
  });

  it('UT-ADM-03 actualizarEstadoReporte hace update + eq con el nuevo estado', async () => {
    respuesta = { data: null, error: null };
    await service.actualizarEstadoReporte('r1', 'resuelto');
    expect(updateSpy).toHaveBeenCalledWith({ estado: 'resuelto' });
    expect(eqSpy).toHaveBeenCalledWith('id_reporte', 'r1');
  });

  it('UT-ADM-04 un error de RLS (42501) se propaga sin transformarse', async () => {
    respuesta = { data: null, error: { message: 'permission denied for table lugar', code: '42501' } };
    await expectAsync(service.eliminarLugar('l1')).toBeRejectedWith(
      jasmine.objectContaining({ code: '42501' })
    );
  });
});
