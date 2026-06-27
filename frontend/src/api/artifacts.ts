import http from './http'

export interface Artifact {
  id: number
  owner_id: number
  type: string
  title: string
  file_path: string
  tags: string[]
  created_at: string
}

export interface SceneArtifactLink {
  id: number
  scene_id: number
  artifact_id: number
  is_active: boolean
  position: string | null
  artifact: Artifact
}

export interface ArtifactPatch {
  title?: string
  tags?: string[]
}

export interface SceneArtifactPatch {
  is_active?: boolean
  position?: string | null
}

export const artifactsApi = {
  upload: (file: File, type: string, title = '', tags: string[] = []) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', type)
    fd.append('title', title)
    fd.append('tags', JSON.stringify(tags))
    return http.post<Artifact>('/artifacts', fd).then((r) => r.data)
  },

  list: (type?: string) =>
    http
      .get<Artifact[]>('/artifacts', { params: type ? { type } : undefined })
      .then((r) => r.data),

  patch: (id: number, data: ArtifactPatch) =>
    http.patch<Artifact>(`/artifacts/${id}`, data).then((r) => r.data),

  remove: (id: number) => http.delete(`/artifacts/${id}`),

  listSceneArtifacts: (sceneId: number) =>
    http.get<SceneArtifactLink[]>(`/scenes/${sceneId}/artifacts`).then((r) => r.data),

  attach: (sceneId: number, artifactId: number) =>
    http.post<SceneArtifactLink>(`/scenes/${sceneId}/artifacts/${artifactId}`).then((r) => r.data),

  detach: (sceneId: number, artifactId: number) =>
    http.delete(`/scenes/${sceneId}/artifacts/${artifactId}`),

  patchLink: (sceneId: number, artifactId: number, data: SceneArtifactPatch) =>
    http
      .patch<SceneArtifactLink>(`/scenes/${sceneId}/artifacts/${artifactId}`, data)
      .then((r) => r.data),
}
