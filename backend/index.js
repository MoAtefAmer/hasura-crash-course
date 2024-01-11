const express = require('express');
const app = express();
const Sequelize = require('sequelize');

app.use(express.json());

const POSTGRES_CONNECTION_STRING =
  'postgres://postgres:postgrespassword@localhost:5432/postgres';

const server = app.listen(8000, () => {
  console.log('server listening on port 8000');
});

app.post('/blog_post_event', async (req, res) => {
  let type;

  // checks for insert and updated old and new data
  if (req.body.event.op === 'INSERT') {
    type = 'created';
  } else if (req.body.event.op === 'UPDATE') {
    if (
      req.body.event.data.old.is_published === true &&
      req.body.event.data.new.is_published === false
    ) {
      type = 'unpublished';
    } else if (
      req.body.event.data.old.is_published === false &&
      req.body.event.data.new.is_published === true
    ) {
      type = 'published';
    }
  }

  if (type) {
    const sequelize = new Sequelize(POSTGRES_CONNECTION_STRING, {
      dialect: 'postgres',
      logging: false,
    });

    const blogPostId = req.body.event.data.new.id;

    await sequelize.query(
      'INSERT INTO blog_post_activity(blog_post_id,type) values (:blogPostId,:type);',
      {
        replacements: {
          blogPostId: blogPostId,
          type: type,
        },
      }
    );

    return res.status(200).send({ status: 'OK' });
  }

  return res.status(400).send({ status: 'Bad Request' });
});

app.post('/archive_posts', async (req, res) => {
  const sequelize = new Sequelize(POSTGRES_CONNECTION_STRING, {
    dialect: 'postgres',
    logging: false,
  });

  const { age_in_seconds } = req.body.input;

 const [result,metadata] =  await sequelize.query(
    "UPDATE blog_post SET is_published = false WHERE date < now() - interval ':age_in_seconds' second;",
    { replacements: { age_in_seconds: age_in_seconds } }
  );

   return res.status(200).json({
        count: metadata.rowCount,
    });

});
