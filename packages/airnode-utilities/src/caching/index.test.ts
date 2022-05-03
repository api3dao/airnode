import fs, { Dirent, PathLike, Stats } from 'fs';
import { caching, CACHE_BASE_PATH } from './index';

describe('caching utils', () => {
  it('initialises the cache - initPath', () => {
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync');
    mkdirSpy.mockReturnValueOnce('');

    const existsSyncSpy = jest.spyOn(fs, 'existsSync');
    existsSyncSpy.mockReturnValueOnce(false);

    caching.initPath();

    expect(existsSyncSpy).toHaveBeenCalledTimes(1);
    expect(mkdirSpy).toHaveBeenCalledTimes(1);
    expect(mkdirSpy).toHaveBeenCalledWith(CACHE_BASE_PATH);
  });

  it(`adds a key to the cache if it doesn't exist`, () => {
    const writeFileSpy = jest.spyOn(fs, 'writeFileSync');
    writeFileSpy.mockImplementationOnce(() => {});

    const existsSyncSpy = jest.spyOn(fs, 'existsSync');
    existsSyncSpy.mockReset();
    existsSyncSpy.mockReturnValueOnce(false);

    caching.addKey('testKey', 'some data', true);

    expect(existsSyncSpy).toHaveBeenCalledTimes(1);
    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    expect(writeFileSpy).toHaveBeenCalledWith('/tmp/airnode-cache/testKey', `"some data"`);
  });

  it(`sweeps the cache - old files`, () => {
    const files = ['1', '2', '3', '4', '5'];
    const filesStatData = files.map((file) => ({ file, mtimeMs: 1 }));

    const readdirSyncSpy = jest.spyOn(fs, 'readdirSync');
    readdirSyncSpy.mockReturnValueOnce(files as unknown as Dirent[]);

    const statSyncSpy = jest.spyOn(fs, 'statSync');

    statSyncSpy.mockImplementation(
      (file: PathLike) =>
        filesStatData.find((statData) => file.toString().indexOf(statData.file) > -1)! as unknown as Stats
    );

    const rmSyncSpy = jest.spyOn(fs, 'rmSync');
    rmSyncSpy.mockImplementation(() => {});

    caching.sweep();

    expect(readdirSyncSpy).toHaveBeenCalledTimes(1);
    expect(statSyncSpy).toHaveBeenCalledTimes(files.length);
    expect(rmSyncSpy).toHaveBeenCalledTimes(files.length);
  });

  it(`sweeps the cache - no old files present`, () => {
    const files = ['1', '2', '3', '4', '5'];
    const filesStatData = files.map((file) => ({ file, mtimeMs: Date.now() }));

    const readdirSyncSpy = jest.spyOn(fs, 'readdirSync');
    readdirSyncSpy.mockReturnValueOnce(files as unknown as Dirent[]);

    const statSyncSpy = jest.spyOn(fs, 'statSync');

    statSyncSpy.mockImplementation(
      (file: PathLike) =>
        filesStatData.find((statData) => file.toString().indexOf(statData.file) > -1)! as unknown as Stats
    );

    const rmSyncSpy = jest.spyOn(fs, 'rmSync');
    rmSyncSpy.mockImplementation(() => {});

    caching.sweep();

    expect(readdirSyncSpy).toHaveBeenCalledTimes(1);
    expect(statSyncSpy).toHaveBeenCalledTimes(files.length);
    expect(rmSyncSpy).toHaveBeenCalledTimes(0);
  });
});
