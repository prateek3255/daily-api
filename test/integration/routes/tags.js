import { expect } from 'chai';
import supertest from 'supertest';
import knexCleaner from 'knex-cleaner';
import db, { migrate } from '../../../src/db';
import publication from '../../../src/models/publication';
import post from '../../../src/models/post';
import fixturePubs from '../../fixtures/publications';
import app from '../../../src';

describe('tags routes', () => {
  let request;
  let server;

  beforeEach(async () => {
    await knexCleaner.clean(db, { ignoreTables: ['knex_migrations', 'knex_migrations_lock'] });
    await migrate();
    await Promise.all(fixturePubs.map(pub =>
      publication.add(pub.name, pub.image, pub.enabled, pub.twitter)));
  });

  before(() => {
    server = app.listen();
    request = supertest(server);
  });

  after(() => {
    server.close();
  });

  it('should fetch popular tags', async () => {
    const getPostTags = (i) => {
      const base = ['b'];
      if (i % 2 === 0) {
        base.push('a');
      }

      if (i % 3 === 0) {
        base.push('c');
      }

      return base;
    };

    await Promise.all(Array.from(new Array(110), (_, i) => ({
      id: i.toString(),
      title: `Post #${i}`,
      url: `https://myblog.com/post${i}.html`,
      publicationId: fixturePubs[0].id,
      createdAt: new Date(),
      image: 'https://myblog.com/image.png',
      ratio: 1.2,
      placeholder: 'data:image/png;base64,qweuoi2108js',
      promoted: false,
      tags: getPostTags(i),
      views: 1,
    })).map(post.add));
    await request.post('/v1/tags/updateCount');

    const result = await request
      .get('/v1/tags/popular')
      .expect(200);

    expect(result.body).to.deep.equal([{ name: 'b' }, { name: 'a' }]);
  });

  it('should search for relevant tags', async () => {
    await db.from('tags_count').insert([
      { tag: 'web-dev', count: 100 },
      { tag: 'software-development', count: 200 },
      { tag: 'dev-leads', count: 50 },
      { tag: 'fullstack', count: 300 },
    ]);

    const result = await request
      .get('/v1/tags/search')
      .query({ query: 'dev' })
      .expect(200);

    expect(result.body).to.deep.equal({
      query: 'dev',
      hits: [{ name: 'software-development' }, { name: 'web-dev' }, { name: 'dev-leads' }],
    });
  });
});
