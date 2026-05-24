import('./backend/models/index.js').then(async m => {
  const [courses] = await m.sequelize.query('SELECT id, code FROM courses WHERE code = "BSCS313L" ORDER BY id');
  console.log('Found:', JSON.stringify(courses));
  if (courses.length > 1) {
    await m.sequelize.query('DELETE FROM courses WHERE id = ?', { replacements: [courses[1].id] });
    console.log('Deleted duplicate id:', courses[1].id);
  }
  await m.sequelize.close();
});
