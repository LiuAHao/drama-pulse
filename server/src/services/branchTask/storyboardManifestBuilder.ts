import type {
  NarrationPayload,
  StoryboardImageItem,
  StoryboardManifest,
  StoryboardResult,
} from './types.js';

export function buildStoryboardManifest(
  title: string,
  hook: string,
  storyboard: StoryboardResult,
  storyboardImages: StoryboardImageItem[],
): StoryboardManifest {
  const imageMap = new Map(storyboardImages.map((item) => [item.shotId, item]));
  const cards = storyboard.shots.map((shot, index) => ({
    scene: shot.scene,
    sceneTitle: shot.sceneTitle,
    imageAssetPath: imageMap.get(shot.scene)?.imageAssetPath ?? '',
    narrationText: shot.narrationText,
    dialogueText: shot.dialogueText,
    order: index + 1,
    endingCard: index === storyboard.shots.length - 1,
  }));

  return {
    coverImage: cards[0]?.imageAssetPath ?? '',
    title,
    hook,
    readingMode: 'vertical_comic',
    cards,
  };
}

export function buildNarrationPayload(manifest: StoryboardManifest): NarrationPayload {
  return {
    narrationText: manifest.cards.map((card) => card.narrationText).filter(Boolean).join('\n\n'),
    narrationVoice: '',
    narrationAudioStatus: 'not_started',
    narrationAudioPath: '',
  };
}
