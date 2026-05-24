import('./backend/models/index.js').then(async m => {
  const [courses] = await m.sequelize.query('SELECT code FROM courses WHERE code = "BSCS313L"');
  console.log('Count:', courses.length);
  if (courses.length > 1) {
    await m.sequelize.query('DELETE FROM courses WHERE code = "BSCS313L" LIMIT 1');
    console.log('Deleted one duplicate');
  }
  await m.sequelize.close();
});
