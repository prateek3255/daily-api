import { expect } from 'chai';
import { createTables, dropTables } from '../../../src/db';
import publication from '../../../src/models/publication';
import post from '../../../src/models/post';
import fixturePubs from '../../fixtures/publications';
import fixture from '../../fixtures/posts';
import event from '../../../src/models/event';

describe('post model', () => {
  beforeEach(async () => {
    await dropTables();
    await createTables();
    await Promise.all(fixturePubs.map(pub =>
      publication.add(pub.name, pub.image, pub.enabled, pub.twitter)));
  });

  it('should add new post to db', async () => {
    const input = fixture.input[0];
    const model = await post.add(
      input.id, input.title, input.url, input.publicationId, input.publishedAt,
      input.createdAt, input.image, input.ratio, input.placeholder,
    );

    expect(model).to.deep.equal(input);
  });

  it('should fetch all posts sorted by time', async () => {
    await Promise.all(fixture.input.map(p =>
      post.add(
        p.id, p.title, p.url, p.publicationId, p.publishedAt, p.createdAt,
        p.image, p.ratio, p.placeholder,
      )));

    const models = await post.getLatest(fixture.input[1].createdAt, 0, 20);
    expect(models).to.deep.equal(fixture.output);
  });

  it('should fetch posts by pages sorted by time', async () => {
    await Promise.all(fixture.input.map(p =>
      post.add(
        p.id, p.title, p.url, p.publicationId, p.publishedAt, p.createdAt,
        p.image, p.ratio, p.placeholder,
      )));

    const page1 = await post.getLatest(fixture.input[1].createdAt, 0, 1);
    expect(page1).to.deep.equal([fixture.output[0]]);

    const page2 = await post.getLatest(fixture.input[1].createdAt, 1, 1);
    expect(page2).to.deep.equal([fixture.output[1]]);
  });

  it('should fetch posts only from given publications', async () => {
    await Promise.all(fixture.input.map(p =>
      post.add(
        p.id, p.title, p.url, p.publicationId, p.publishedAt, p.createdAt,
        p.image, p.ratio, p.placeholder,
      )));

    const models =
      await post.getLatest(fixture.input[1].createdAt, 0, 20, [fixture.input[1].publicationId]);
    expect(models).to.deep.equal([fixture.output[0]]);
  });

  it('should fetch post by id', async () => {
    await Promise.all(fixture.input.map(p =>
      post.add(
        p.id, p.title, p.url, p.publicationId, p.publishedAt, p.createdAt,
        p.image, p.ratio, p.placeholder,
      )));

    const model = await post.get(fixture.output[0].id);
    expect(model).to.deep.equal(fixture.output[0]);
  });

  it('should return null when no such post', async () => {
    const model = await post.get('123124');
    expect(model).to.equal(null);
  });

  it('should return a post to tweet', async () => {
    await Promise.all(fixture.input.map(p =>
      post.add(
        p.id, p.title, p.url, p.publicationId, p.publishedAt, p.createdAt,
        p.image, p.ratio, p.placeholder,
      )));

    await Promise.all([...Array(40).keys()].map((i) => {
      const eventToAdd = {
        type: 'view',
        userId: `user-${i}`,
        postId: fixture.input[0].id,
        referer: null,
        agent: 'chrome',
        ip: '100.0.0.1',
        timestamp: new Date(2017, 10, 21, 15, 10, 5),
      };

      return event.add(
        eventToAdd.type, eventToAdd.userId, eventToAdd.postId,
        eventToAdd.referer, eventToAdd.agent, eventToAdd.ip, eventToAdd.timestamp,
      );
    }));

    const model = await post.getPostToTweet();
    expect(model).to.deep.equal({
      id: fixture.input[0].id,
      title: fixture.input[0].title,
      twitter: fixturePubs[0].twitter,
    });
  });

  it('should set the post as tweeted', async () => {
    await Promise.all(fixture.input.map(p =>
      post.add(
        p.id, p.title, p.url, p.publicationId, p.publishedAt, p.createdAt,
        p.image, p.ratio, p.placeholder,
      )));

    await Promise.all([...Array(40).keys()].map((i) => {
      const eventToAdd = {
        type: 'view',
        userId: `user-${i}`,
        postId: fixture.input[0].id,
        referer: null,
        agent: 'chrome',
        ip: '100.0.0.1',
        timestamp: new Date(2017, 10, 21, 15, 10, 5),
      };

      return event.add(
        eventToAdd.type, eventToAdd.userId, eventToAdd.postId,
        eventToAdd.referer, eventToAdd.agent, eventToAdd.ip, eventToAdd.timestamp,
      );
    }));

    await post.setPostsAsTweeted(fixture.input[0].id);

    const model = await post.getPostToTweet();
    expect(model).to.equal(null);
  });
});