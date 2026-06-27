import { ref } from 'vue'
import { defineStore } from 'pinia'
import { artifactsApi, type Artifact, type SceneArtifactLink } from '../api/artifacts'

export const useArtifactsStore = defineStore('artifacts', () => {
  const library = ref<Artifact[]>([])
  const sceneLinks = ref<SceneArtifactLink[]>([])
  const currentSceneId = ref<number | null>(null)
  const uploading = ref(false)

  async function fetchLibrary(type?: string) {
    library.value = await artifactsApi.list(type)
  }

  async function upload(file: File, type: string, title = '') {
    uploading.value = true
    try {
      const artifact = await artifactsApi.upload(file, type, title)
      library.value = [artifact, ...library.value]
      return artifact
    } finally {
      uploading.value = false
    }
  }

  async function patchArtifact(id: number, data: { title?: string; tags?: string[] }) {
    const updated = await artifactsApi.patch(id, data)
    const idx = library.value.findIndex((a) => a.id === id)
    if (idx !== -1) library.value[idx] = updated
    sceneLinks.value = sceneLinks.value.map((l) =>
      l.artifact_id === id ? { ...l, artifact: updated } : l,
    )
    return updated
  }

  async function deleteArtifact(id: number) {
    await artifactsApi.remove(id)
    library.value = library.value.filter((a) => a.id !== id)
    sceneLinks.value = sceneLinks.value.filter((l) => l.artifact_id !== id)
  }

  async function fetchSceneArtifacts(sceneId: number) {
    currentSceneId.value = sceneId
    sceneLinks.value = await artifactsApi.listSceneArtifacts(sceneId)
  }

  async function attachToScene(sceneId: number, artifactId: number) {
    const link = await artifactsApi.attach(sceneId, artifactId)
    sceneLinks.value = [...sceneLinks.value, link]
    return link
  }

  async function detachFromScene(sceneId: number, artifactId: number) {
    await artifactsApi.detach(sceneId, artifactId)
    sceneLinks.value = sceneLinks.value.filter((l) => l.artifact_id !== artifactId)
  }

  async function patchLink(
    sceneId: number,
    artifactId: number,
    data: { is_active?: boolean; position?: string | null },
  ) {
    const updated = await artifactsApi.patchLink(sceneId, artifactId, data)

    // зеркалим бизнес-правила локально, чтобы не делать лишний запрос
    if (updated.is_active && updated.artifact.type === 'location_image') {
      sceneLinks.value = sceneLinks.value.map((l) =>
        l.artifact.type === 'location_image' && l.artifact_id !== artifactId
          ? { ...l, is_active: false }
          : l,
      )
    }

    sceneLinks.value = sceneLinks.value.map((l) =>
      l.artifact_id === artifactId ? updated : l,
    )
    return updated
  }

  function clearSceneArtifacts() {
    sceneLinks.value = []
    currentSceneId.value = null
  }

  return {
    library,
    sceneLinks,
    currentSceneId,
    uploading,
    fetchLibrary,
    upload,
    patchArtifact,
    deleteArtifact,
    fetchSceneArtifacts,
    attachToScene,
    detachFromScene,
    patchLink,
    clearSceneArtifacts,
  }
})
