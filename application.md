1. Application has to have graphic interface.
2. Main goal of the application is to display details of the catalogue of the astro photos directory with multiple objects.
3. Application has to run under windows and ubuntu.
4. User has to have ability to select main root directory.
5. User has to have ability to click analyze button, that will re-analyze whole root directory.
6. The structure of the directory is as fallows:
    - each of the object lives in separate directory in the root, e.g. there are photos of M31 galaxy, and all of them are under `{root}/M 31`. Occasionally, there can be folder called {object name}_mosaic, like `M 31_mosaic`. Mosaics should be threated separatelly.
    - in each directory of the object, there are directories, that groups photos by type, so e.g. in `M 31` directory, there are two: `LP` and `IRCUT`.
    - in each of the type of the photos, photos are aggregated based on the date, so e.g. in the LP directory, there are directories like: `2026.08.09 LP 20s`. Patter here is `date type capture-time`.
    - if some directory does not follow that pattern, just display warning, and message what is not ok (either with structure or naming)
7. Inside top bottom directories, there should be fit files.
8. Job of the application is to display list of objects, and for each of them total integration type per type. So, e.g. if `M 31` has `LP` and `IRCUT` directories inside, each of them has `2026.08.09 LP 20s` and `2026.08.09 IRCUT 20s` respectively, and in first there are 5 20s frames, and in second there are 4 20s frames, then there should be information next to `M 31`: LP: 5 frames, total exposure: 1 min 40 sec, IRCUT: 4 frames, total exposure 1 min 20 sec.
9. Data should be refreshed after user clicks the button to refresh data.
10. Application should have modern look, and pleasant asthetics.
11. All data of the application should be stored between appliction runs, and there should be no need to re-run calculations each time.
