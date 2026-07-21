import axios from 'axios'

export const axiosJson = axios.create({
  headers: {
    Accept: 'application/json',
  },
})
